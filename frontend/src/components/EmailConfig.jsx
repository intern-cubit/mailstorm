import React from 'react';
import { Mail, Server, Info, Eye, EyeOff } from 'lucide-react';

const EmailConfig = ({
    senderEmail,
    onSenderEmailChange,
    senderPassword,
    onSenderPasswordChange,
    smtpServer,
    onSmtpServerChange,
    smtpPort,
    onSmtpPortChange,
}) => {
    const [showPassword, setShowPassword] = React.useState(false);

    // Common SMTP configurations for quick setup
    const commonConfigs = [
        { name: 'Gmail', server: 'smtp.gmail.com', port: 587 },
        { name: 'Outlook/Hotmail', server: 'smtp-mail.outlook.com', port: 587 },
        { name: 'Yahoo', server: 'smtp.mail.yahoo.com', port: 587 },
        { name: 'Custom', server: '', port: 587 }
    ];

    const handleQuickConfig = (config) => {
        onSmtpServerChange(config.server);
        onSmtpPortChange(config.port);
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            {/* Main Configuration Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Column - Email Credentials */}
                <div className="bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border-gray-800 rounded-xl p-6 shadow-sm">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <Mail className="mr-3 text-blue-600 dark:text-blue-400" size={24} />
                        Email Credentials
                    </h3>

                    <div className="space-y-6">
                        <div>
                            <label htmlFor="sender-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Your Email Address *
                            </label>
                            <input
                                id="sender-email"
                                type="email"
                                placeholder="e.g., yourname@gmail.com"
                                value={senderEmail}
                                onChange={(e) => onSenderEmailChange(e.target.value)}
                                className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/70 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-sm text-gray-900 dark:text-white shadow-inner text-base transition-all duration-200"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="sender-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                App Password / Email Password *
                            </label>
                            <div className="relative">
                                <input
                                    id="sender-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Use an App Password for Gmail/Outlook"
                                    value={senderPassword}
                                    onChange={(e) => onSenderPasswordChange(e.target.value)}
                                    className="w-full p-4 pr-12 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/70 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-sm text-gray-900 dark:text-white shadow-inner text-base transition-all duration-200"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <div className="mt-2 p-3 bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start">
                                    <Info className="mr-2 mt-0.5 flex-shrink-0" size={14} />
                                    <span>
                                        <strong>Important:</strong> For Gmail/Outlook, use an{' '}
                                        <a
                                            href="https://support.google.com/accounts/answer/185833?hl=en"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
                                        >
                                            App Password
                                        </a>{' '}
                                        if 2-Factor Authentication is enabled.
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - SMTP Configuration */}
                <div className="bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border-gray-800 rounded-xl p-6 shadow-sm">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <Server className="mr-3 text-blue-600 dark:text-blue-400" size={24} />
                        SMTP Server Settings
                    </h3>

                    {/* Quick Setup Buttons */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Quick Setup
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {commonConfigs.map((config) => (
                                <button
                                    key={config.name}
                                    type="button"
                                    onClick={() => handleQuickConfig(config)}
                                    className={`p-3 text-sm font-medium rounded-lg border transition-all duration-200 ${smtpServer === config.server
                                            ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                                            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    {config.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label htmlFor="smtp-server" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                SMTP Server *
                            </label>
                            <input
                                id="smtp-server"
                                type="text"
                                placeholder="e.g., smtp.gmail.com"
                                value={smtpServer}
                                onChange={(e) => onSmtpServerChange(e.target.value)}
                                className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/70 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-sm text-gray-900 dark:text-white shadow-inner text-base transition-all duration-200"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="smtp-port" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                SMTP Port *
                            </label>
                            <input
                                id="smtp-port"
                                type="number"
                                placeholder="e.g., 587 (TLS) or 465 (SSL)"
                                value={smtpPort}
                                onChange={(e) => onSmtpPortChange(parseInt(e.target.value, 10))}
                                className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/70 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-sm text-gray-900 dark:text-white shadow-inner text-base transition-all duration-200"
                                required
                            />
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Common ports: 587 (TLS), 465 (SSL), 25 (unsecured)
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Notice */}
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                    <Info className="mr-2" size={18} />
                    Security & Privacy Notice
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
                    <div>
                        <h5 className="font-medium mb-2">Email Security</h5>
                        <ul className="space-y-1 list-disc pl-4">
                            <li>Always use App Passwords for enhanced security</li>
                            <li>Enable 2-Factor Authentication on your email account</li>
                            <li>Never share your email credentials</li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-medium mb-2">Best Practices</h5>
                        <ul className="space-y-1 list-disc pl-4">
                            <li>Use TLS encryption (port 587) when available</li>
                            <li>Test with a small batch before large campaigns</li>
                            <li>Monitor your email reputation regularly</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Connection Status Indicator */}
            {senderEmail && senderPassword && smtpServer && smtpPort && (
                <div className="mt-6 p-4 bg-green-50/70 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-center text-green-800 dark:text-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                        <span className="font-medium">Configuration Complete</span>
                        <span className="ml-2 text-sm">Ready to proceed to next step</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailConfig;