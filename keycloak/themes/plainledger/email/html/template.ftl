<#macro emailLayout>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PlainLedger</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background-color: #f7f7f7;
            margin: 0;
            padding: 0;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .email-card {
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .email-header {
            background: #1a1a1a;
            color: #ffffff;
            padding: 24px;
            text-align: center;
        }
        .email-logo {
            font-size: 24px;
            font-weight: 600;
            letter-spacing: -0.02em;
        }
        .email-logo::before {
            content: "▢ ";
            font-size: 20px;
        }
        .email-body {
            padding: 32px;
        }
        .email-body p {
            margin: 0 0 16px;
            color: #525252;
        }
        .email-body p:last-child {
            margin-bottom: 0;
        }
        .email-button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #1a1a1a;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            margin: 16px 0;
        }
        .email-button:hover {
            background-color: #2d2d2d;
        }
        .email-footer {
            padding: 24px 32px;
            background: #f7f7f7;
            text-align: center;
            font-size: 13px;
            color: #737373;
        }
        .email-footer a {
            color: #1a1a1a;
            text-decoration: none;
        }
        .email-divider {
            border: none;
            border-top: 1px solid #e5e5e5;
            margin: 24px 0;
        }
        .email-note {
            font-size: 13px;
            color: #737373;
            background: #f7f7f7;
            padding: 16px;
            border-radius: 8px;
            margin-top: 24px;
        }
        ul {
            padding-left: 20px;
            color: #525252;
        }
        li {
            margin-bottom: 8px;
        }
        strong {
            color: #1a1a1a;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-card">
            <div class="email-header">
                <div class="email-logo">PlainLedger</div>
            </div>
            <div class="email-body">
                <#nested>
            </div>
            <div class="email-footer">
                <p>No surprises. Just numbers.</p>
                <p>&copy; ${.now?string('yyyy')} PlainLedger Inc. All rights reserved.</p>
                <p><a href="https://plainledger.ca">plainledger.ca</a></p>
            </div>
        </div>
    </div>
</body>
</html>
</#macro>
