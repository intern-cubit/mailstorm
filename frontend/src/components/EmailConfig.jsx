import React from 'react';
import { Mail, Server, Info, Eye, EyeOff, PlusCircle, XCircle, Settings, Loader2, Trash } from 'lucide-react'; // Added Loader2

const EmailConfig = ({
    emailConfigs, // This will be an array of objects: [{ senderEmail, senderPassword, smtpServer, smtpPort }]
    onEmailConfigsChange, // Callback to update the parent's state (for add/remove)
    onSaveConfig, // Callback to save a *single* config to backend
    onDeleteConfig, // Callback to delete a *single* config from backend
    isSavingConfigs // General saving state, consider making it per-index if needed
}) => {
    // We'll manage the visibility of passwords for each entry
    const [showPassword, setShowPassword] = React.useState({});

    const commonConfigs = [
        { name: 'Gmail', server: 'smtp.gmail.com', port: 587 },
        { name: 'Outlook/Hotmail', server: 'smtp-mail.outlook.com', port: 587 },
        { name: 'Yahoo', server: 'smtp.mail.yahoo.com', port: 587 },
        { name: 'Custom', server: '', port: 587 }
    ];

    const handleQuickConfig = (config, index) => {
        const updatedConfigs = [...emailConfigs];
        updatedConfigs[index] = {
            ...updatedConfigs[index],
            smtpServer: config.server,
            smtpPort: config.port,
        };
        onEmailConfigsChange(updatedConfigs);
    };

    const handleAddConfig = () => {
        onEmailConfigsChange([...emailConfigs, { senderEmail: '', senderPassword: '', smtpServer: '', smtpPort: 587 }]);
    };

    const handleRemoveConfigLocally = (index) => {
        const updatedConfigs = emailConfigs.filter((_, i) => i !== index);
        onEmailConfigsChange(updatedConfigs);
    };

    const handleChange = (index, field, value) => {
        const updatedConfigs = [...emailConfigs];
        updatedConfigs[index] = {
            ...updatedConfigs[index],
            [field]: value,
        };
        onEmailConfigsChange(updatedConfigs);
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            {emailConfigs.map((config, index) => (
                <div key={index} className="mb-8 p-6 border border-gray-300 dark:border-gray-700 rounded-xl bg-white/70 backdrop-blur-sm dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md shadow-sm relative">
                    {emailConfigs.length > 1 && (
                        <button
                            type="button"
                            // Call onDeleteConfig first, then remove locally
                            onClick={() => { handleRemoveConfigLocally(index); }}
                            className="absolute top-4 right-4 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            aria-label={`Remove email configuration ${index + 1}`}
                        >
                            <XCircle size={24} />
                        </button>
                    )}
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                        <Mail className="mr-3 text-blue-600 dark:text-blue-400" size={24} />
                        Email Configuration {index + 1}
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column - Email Credentials */}
                        <div className="space-y-6">
                            <div>
                                <label htmlFor={`sender-email-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Your Email Address *
                                </label>
                                <input
                                    id={`sender-email-${index}`}
                                    type="email"
                                    placeholder="e.g., yourname@gmail.com"
                                    value={config.senderEmail}
                                    onChange={(e) => handleChange(index, 'senderEmail', e.target.value)}
                                    className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/70 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-sm text-gray-900 dark:text-white shadow-inner text-base transition-all duration-200"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor={`sender-password-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    App Password / Email Password *
                                </label>
                                <div className="relative">
                                    <input
                                        id={`sender-password-${index}`}
                                        type={showPassword[index] ? "text" : "password"}
                                        placeholder="Use an App Password for Gmail/Outlook"
                                        value={config.senderPassword}
                                        onChange={(e) => handleChange(index, 'senderPassword', e.target.value)}
                                        className="w-full p-4 pr-12 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/70 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-sm text-gray-900 dark:text-white shadow-inner text-base transition-all duration-200"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(prev => ({ ...prev, [index]: !prev[index] }))}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                    >
                                        {showPassword[index] ? <EyeOff size={20} /> : <Eye size={20} />}
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

                        {/* Right Column - SMTP Configuration */}
                        <div className="space-y-6">
                            {/* Quick Setup Buttons */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Quick Setup
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {commonConfigs.map((c) => (
                                        <button
                                            key={c.name}
                                            type="button"
                                            onClick={() => handleQuickConfig(c, index)}
                                            className={`p-3 text-sm font-medium rounded-lg border transition-all duration-200 ${config.smtpServer === c.server && config.smtpPort === c.port
                                                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                                                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                                }`}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label htmlFor={`smtp-server-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    SMTP Server *
                                </label>
                                <input
                                    id={`smtp-server-${index}`}
                                    type="text"
                                    placeholder="e.g., smtp.gmail.com"
                                    value={config.smtpServer}
                                    onChange={(e) => handleChange(index, 'smtpServer', e.target.value)}
                                    className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/70 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-sm text-gray-900 dark:text-white shadow-inner text-base transition-all duration-200"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor={`smtp-port-${index}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    SMTP Port *
                                </label>
                                <input
                                    id={`smtp-port-${index}`}
                                    type="number"
                                    placeholder="e.g., 587 (TLS) or 465 (SSL)"
                                    value={config.smtpPort}
                                    onChange={(e) => handleChange(index, 'smtpPort', parseInt(e.target.value, 10))}
                                    className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/70 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-sm text-gray-900 dark:text-white shadow-inner text-base transition-all duration-200"
                                    required
                                />
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Common ports: 587 (TLS), 465 (SSL), 25 (unsecured)
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        {/* The delete button (XCircle) is at the top right now */}
                        <button
                            onClick={() => onDeleteConfig(config, index)} // Pass specific config and index
                            disabled={isSavingConfigs || !config.senderEmail || !config.senderPassword || !config.smtpServer || !config.smtpPort}
                            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md flex items-center justify-center"
                        >
                            {isSavingConfigs ? (
                                <>
                                    <Loader2 className="mr-3 animate-spin" size={20} />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash className="mr-3" size={20} />
                                    Delete Email
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => onSaveConfig(config, index)} // Pass specific config and index
                            disabled={isSavingConfigs || !config.senderEmail || !config.senderPassword || !config.smtpServer || !config.smtpPort}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md flex items-center justify-center"
                        >
                            {isSavingConfigs ? (
                                <>
                                    <Loader2 className="mr-3 animate-spin" size={20} />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Settings className="mr-3" size={20} />
                                    Save Email
                                </>
                            )}
                        </button>
                    </div>
                </div>
            ))}

            <button
                type="button"
                onClick={handleAddConfig}
                className="mt-4 flex items-center justify-center p-3 w-full border border-dashed border-gray-400 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
                <PlusCircle size={20} className="mr-2" /> Add Another Email Account
            </button>

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
            {emailConfigs.every(config => config.senderEmail && config.senderPassword && config.smtpServer && config.smtpPort) && (
                <div className="mt-6 p-4 bg-green-50/70 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <div className="flex items-center text-green-800 dark:text-green-200">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
                        <span className="font-medium">All Configurations Complete</span>
                        <span className="ml-2 text-sm">Ready to proceed to next step</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailConfig;