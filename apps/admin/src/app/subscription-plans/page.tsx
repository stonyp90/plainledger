'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminShell } from '@/components/layout/AdminShell';
import { useAdmin } from '@/hooks/useAdmin';
import { getAuthToken } from '@/lib/api';
import { Plus, Search, CreditCard, Edit, Trash2, X, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// API client functions
async function getSubscriptionPlans() {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/admin/subscription-plans`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) return [];
  return response.json();
}

async function createPlan(data: any) {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/admin/subscription-plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create plan');
  return response.json();
}

async function updatePlan(id: string, data: any) {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/admin/subscription-plans/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update plan');
  return response.json();
}

async function deletePlan(id: string) {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/admin/subscription-plans/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error('Failed to delete plan');
}

interface PlanFormData {
  id: string;
  name: string;
  description: string;
  stripeProductId: string;
  stripePriceId: string;
  stripePriceIdAnnual: string;
  isActive: boolean;
  displayOrder: number;
}

const defaultFormData: PlanFormData = {
  id: '',
  name: '',
  description: '',
  stripeProductId: '',
  stripePriceId: '',
  stripePriceIdAnnual: '',
  isActive: true,
  displayOrder: 0,
};

export default function SubscriptionPlansPage() {
  const { token } = useAdmin();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscription-plans', token],
    queryFn: getSubscriptionPlans,
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      setDeleteConfirm(null);
    },
  });

  const filteredPlans = plans?.filter((plan: any) =>
    plan.name.toLowerCase().includes(search.toLowerCase()) ||
    plan.id.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData(defaultFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      stripeProductId: plan.stripeProductId || '',
      stripePriceId: plan.stripePriceId || '',
      stripePriceIdAnnual: plan.stripePriceIdAnnual || '',
      isActive: plan.isActive !== false,
      displayOrder: plan.displayOrder || 0,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      deleteMutation.mutate(id);
    } else {
      setDeleteConfirm(id);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminShell>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Subscription Plans</h1>
            <p className="text-admin-400 mt-1">
              Manage subscription plans and Stripe mappings
            </p>
          </div>
          <button 
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 border border-primary-600/40 hover:bg-primary-600/10 hover:border-primary-600/70 rounded-lg text-primary-400 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Plan
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-admin-400" />
            <input
              type="text"
              placeholder="Search plans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-admin-800 border border-admin-700 rounded-lg text-white placeholder-admin-400"
            />
          </div>
        </div>

        {/* Plans List */}
        {isLoading ? (
          <div className="text-admin-400">Loading...</div>
        ) : filteredPlans.length === 0 ? (
          <div className="text-center py-12 text-admin-400">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No subscription plans found</p>
            <button 
              onClick={openCreateModal}
              className="mt-4 text-primary-400 hover:text-primary-300"
            >
              Create your first plan
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPlans.map((plan: any) => (
              <div
                key={plan.id}
                className="bg-admin-800 border border-admin-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <CreditCard className="w-5 h-5 text-admin-400" />
                  <div>
                    <h3 className="text-white font-semibold">{plan.name}</h3>
                    <p className="text-admin-400 text-sm">{plan.id}</p>
                    {plan.description && (
                      <p className="text-admin-400 text-sm mt-1">{plan.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-admin-400">
                        Entitlements: {plan.entitlements?.length || 0}
                      </span>
                      <span className="text-admin-400">
                        Stripe: {plan.stripeProductId || 'Not mapped'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => openEditModal(plan)}
                    className="p-2 hover:bg-primary-600/20 rounded transition-colors"
                    title="Edit plan"
                  >
                    <Edit className="w-4 h-4 text-admin-400 hover:text-primary-400" />
                  </button>
                  <button 
                    onClick={() => handleDelete(plan.id)}
                    className={`p-2 rounded transition-colors ${
                      deleteConfirm === plan.id
                        ? 'border border-red-600/40 bg-red-600/10 text-red-400'
                        : 'hover:bg-red-600/20'
                    }`}
                    title={deleteConfirm === plan.id ? 'Click again to confirm' : 'Delete plan'}
                  >
                    {deleteMutation.isPending && deleteMutation.variables === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-admin-800 rounded-xl border border-admin-700 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-admin-700">
                <h2 className="text-lg font-semibold text-white">
                  {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                </h2>
                <button 
                  onClick={closeModal}
                  className="p-1 hover:bg-admin-700 rounded"
                >
                  <X className="w-5 h-5 text-admin-400" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-admin-300 mb-1">
                    Plan ID *
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    disabled={!!editingPlan}
                    required
                    placeholder="e.g., pro, enterprise"
                    className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white placeholder-admin-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-admin-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Pro Plan"
                    className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white placeholder-admin-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-admin-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Plan description..."
                    rows={2}
                    className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white placeholder-admin-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-admin-300 mb-1">
                      Stripe Product ID
                    </label>
                    <input
                      type="text"
                      value={formData.stripeProductId}
                      onChange={(e) => setFormData({ ...formData, stripeProductId: e.target.value })}
                      placeholder="prod_xxx"
                      className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white placeholder-admin-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-300 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-admin-300 mb-1">
                      Stripe Price ID (Monthly)
                    </label>
                    <input
                      type="text"
                      value={formData.stripePriceId}
                      onChange={(e) => setFormData({ ...formData, stripePriceId: e.target.value })}
                      placeholder="price_xxx"
                      className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white placeholder-admin-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-300 mb-1">
                      Stripe Price ID (Annual)
                    </label>
                    <input
                      type="text"
                      value={formData.stripePriceIdAnnual}
                      onChange={(e) => setFormData({ ...formData, stripePriceIdAnnual: e.target.value })}
                      placeholder="price_xxx"
                      className="w-full px-3 py-2 bg-admin-900 border border-admin-700 rounded-lg text-white placeholder-admin-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-admin-700 bg-admin-900 text-primary-600"
                  />
                  <label htmlFor="isActive" className="text-sm text-admin-300">
                    Plan is active and visible to customers
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-admin-700">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-admin-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 border border-primary-600/40 hover:bg-primary-600/10 hover:border-primary-600/70 disabled:opacity-50 rounded-lg text-primary-400 transition-colors"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
