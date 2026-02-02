#!/usr/bin/env python3
"""
Fine-tune Decision Intelligence Model
Part of the Context Intelligence Platform

Fine-tunes Mistral 7B using LoRA on decision-outcome data.
Can be run locally for testing or in SageMaker for production training.
"""

import os
import json
import boto3
from datetime import datetime
from pathlib import Path

# Training libraries
try:
    import torch
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        TrainingArguments,
        Trainer,
        DataCollatorForLanguageModeling,
    )
    from peft import LoraConfig, get_peft_model, TaskType
    from datasets import load_dataset, Dataset
except ImportError:
    print("Required libraries not installed. Install with:")
    print("pip install torch transformers datasets peft accelerate")
    exit(1)

def load_training_data_from_s3(s3_path: str, local_cache: str = "./data"):
    """Load training data from S3"""
    s3 = boto3.client('s3')
    
    # Parse S3 path
    if s3_path.startswith('s3://'):
        s3_path = s3_path[5:]
    
    bucket, prefix = s3_path.split('/', 1)
    
    # Download files
    os.makedirs(local_cache, exist_ok=True)
    
    # List and download JSONL files
    response = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
    files = []
    
    if 'Contents' in response:
        for obj in response['Contents']:
            if obj['Key'].endswith('.jsonl') or obj['Key'].endswith('.json'):
                local_file = os.path.join(local_cache, os.path.basename(obj['Key']))
                s3.download_file(bucket, obj['Key'], local_file)
                files.append(local_file)
    
    return files

def load_training_data_local(data_path: str):
    """Load training data from local files"""
    files = []
    if os.path.isfile(data_path):
        files = [data_path]
    elif os.path.isdir(data_path):
        files = [os.path.join(data_path, f) for f in os.listdir(data_path) 
                 if f.endswith('.jsonl') or f.endswith('.json')]
    return files

def format_prompt(example):
    """Format example for instruction tuning"""
    instruction = example['instruction']
    input_text = example['input']
    output_text = example['output']
    
    # Mistral instruction format
    prompt = f"""<s>[INST] {instruction}

{input_text} [/INST] {output_text}</s>"""
    
    return {'text': prompt}

def train_decision_model(
    model_name: str = "mistralai/Mistral-7B-Instruct-v0.2",
    training_data_path: str = None,
    output_dir: str = "./decision-model",
    use_s3: bool = False,
    s3_output_path: str = None,
    num_train_epochs: int = 3,
    per_device_train_batch_size: int = 4,
    gradient_accumulation_steps: int = 4,
    learning_rate: float = 2e-4,
    lora_r: int = 16,
    lora_alpha: int = 32,
    lora_dropout: float = 0.05,
):
    """
    Fine-tune a language model on decision-outcome data.
    Uses LoRA for efficient training.
    """
    
    print(f"Loading base model: {model_name}")
    
    # Load base model
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True,
    )
    
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    # Configure LoRA for efficient fine-tuning
    lora_config = LoraConfig(
        r=lora_r,
        lora_alpha=lora_alpha,
        target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
        lora_dropout=lora_dropout,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )
    
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    
    # Load training data
    print(f"Loading training data from: {training_data_path}")
    
    if use_s3:
        data_files = load_training_data_from_s3(training_data_path)
    else:
        data_files = load_training_data_local(training_data_path)
    
    if not data_files:
        raise ValueError(f"No training data files found at {training_data_path}")
    
    # Load dataset
    dataset = load_dataset(
        "json",
        data_files=data_files,
    )
    
    # Format prompts
    dataset = dataset.map(format_prompt)
    
    # Tokenize
    def tokenize_function(examples):
        return tokenizer(
            examples['text'],
            truncation=True,
            max_length=2048,
            padding="max_length",
        )
    
    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=True,
        remove_columns=dataset['train'].column_names,
    )
    
    # Split into train/validation if not already split
    if 'train' not in tokenized_dataset:
        tokenized_dataset = tokenized_dataset['train'].train_test_split(test_size=0.2)
        tokenized_dataset['validation'] = tokenized_dataset['test']
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=num_train_epochs,
        per_device_train_batch_size=per_device_train_batch_size,
        gradient_accumulation_steps=gradient_accumulation_steps,
        learning_rate=learning_rate,
        warmup_steps=100,
        logging_steps=10,
        save_strategy="epoch",
        evaluation_strategy="epoch",
        fp16=True,
        load_best_model_at_end=True,
        report_to="none",  # Disable wandb/tensorboard for now
    )
    
    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,
    )
    
    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset['train'],
        eval_dataset=tokenized_dataset.get('validation'),
        data_collator=data_collator,
    )
    
    # Train
    print("Starting training...")
    trainer.train()
    
    # Save model
    print(f"Saving model to {output_dir}")
    trainer.save_model()
    tokenizer.save_pretrained(output_dir)
    
    # Upload to S3 if specified
    if s3_output_path:
        print(f"Uploading model to S3: {s3_output_path}")
        s3 = boto3.client('s3')
        
        # Parse S3 path
        if s3_output_path.startswith('s3://'):
            s3_path = s3_output_path[5:]
        else:
            s3_path = s3_output_path
        
        bucket, prefix = s3_path.split('/', 1)
        
        # Upload all files
        for root, dirs, files in os.walk(output_dir):
            for file in files:
                local_path = os.path.join(root, file)
                s3_key = os.path.join(prefix, os.path.relpath(local_path, output_dir))
                s3.upload_file(local_path, bucket, s3_key)
        
        print(f"Model uploaded to s3://{bucket}/{prefix}")
    
    print("Training complete!")
    return model, tokenizer

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Train Decision Intelligence Model')
    parser.add_argument('--model-name', type=str, default='mistralai/Mistral-7B-Instruct-v0.2')
    parser.add_argument('--training-data', type=str, required=True, help='Path to training data (local or S3)')
    parser.add_argument('--output-dir', type=str, default='./decision-model')
    parser.add_argument('--s3-output', type=str, help='S3 path to upload model')
    parser.add_argument('--use-s3', action='store_true', help='Load training data from S3')
    parser.add_argument('--epochs', type=int, default=3)
    parser.add_argument('--batch-size', type=int, default=4)
    parser.add_argument('--learning-rate', type=float, default=2e-4)
    
    args = parser.parse_args()
    
    train_decision_model(
        model_name=args.model_name,
        training_data_path=args.training_data,
        output_dir=args.output_dir,
        use_s3=args.use_s3,
        s3_output_path=args.s3_output,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        learning_rate=args.learning_rate,
    )
