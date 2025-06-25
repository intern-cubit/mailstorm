import React, { useState, useEffect } from 'react';
import { Computer, Fingerprint, Key, CheckCircle, XCircle, Info, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const SystemActivation = ({ onActivationSuccess }) => {
    const [systemId, setSystemId] = useState('Loading...');
    const [activationKey, setActivationKey] = useState('');
    const [message, setMessage] = useState('');
    const [isActivated, setIsActivated] = useState(false);
    const [isLoadingSystemInfo, setIsLoadingSystemInfo] = useState(true);
    const [isLoadingActivationStatus, setIsLoadingActivationStatus] = useState(true);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const ACTIVATION_URL = "https://api-keygen.obzentechnolabs.com/api/sadmin/activate" //|| "http://localhost:5000/api/sadmin/activate"; //

    useEffect(() => {
        const fetchAllInfo = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/system-info`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                const data = await response.json();
                setSystemId(data.systemId);
            } catch (error) {
                console.error('Error fetching system info:', error);
                setSystemId('Error fetching');
                toast.error('Failed to fetch system information. Ensure the backend is running.');
            } finally {
                setIsLoadingSystemInfo(false);
            }

            try {
                const response = await fetch(`${API_BASE_URL}/check-activation`);
                const data = await response.json();
                if (response.ok && data.deviceActivation) {
                    setIsActivated(true);
                    setMessage('System is already activated!');
                    toast.success('System is already activated!');
                    if (onActivationSuccess) {
                        onActivationSuccess();
                    }
                } else {
                    setIsActivated(false);
                    setMessage(data.message || 'System is not activated. Please enter your key.');
                }
            } catch (error) {
                console.error('Error checking initial activation status:', error);
                setMessage('Failed to check activation status. Backend unreachable?');
                setIsActivated(false);
                toast.error('Failed to check initial activation status.');
            } finally {
                setIsLoadingActivationStatus(false);
            }
        };

        fetchAllInfo();
    }, [API_BASE_URL, onActivationSuccess]);

    const handleActivate = async () => {
        if (!activationKey) {
            setMessage('Please enter an activation key.');
            toast.error('Please enter an activation key.');
            return;
        }

        if (isLoadingSystemInfo || isLoadingActivationStatus) {
            setMessage('System information or activation status is still loading. Please wait.');
            toast.warn('System information or activation status is still loading. Please wait.');
            return;
        }

        try {
            const response = await fetch(`${ACTIVATION_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    systemId,
                    activationKey,
                    appName: 'Email Storm'
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                setIsActivated(data.success);

                if (data.success) {
                    toast.success(data.message);
                    if (onActivationSuccess) {
                        onActivationSuccess();
                    }
                } else {
                    toast.error(`Activation failed: ${data.message}`);
                }
                setActivationKey('');
            } else {
                let errorMessage = 'An unknown error occurred during activation.';

                if (data.detail && typeof data.detail === 'object' && data.detail.message) {
                    errorMessage = data.detail.message;
                }
                else if (typeof data.detail === 'string') {
                    errorMessage = data.detail;
                }
                else if (data.message) {
                    errorMessage = data.message;
                }
                else {
                    errorMessage = `HTTP error! Status: ${response.status}. Please check backend logs.`;
                }

                setMessage(`Activation failed: ${errorMessage}`);
                setIsActivated(false);
                toast.error(`Activation failed: ${errorMessage}`);
                console.error('Activation failed response:', data);
            }
        } catch (error) {
            console.error('Network error during activation:', error);
            setMessage('Failed to activate. Please check your network connection and ensure the backend is running.');
            setIsActivated(false);
            toast.error('Failed to activate. Check network/backend.');
        }
    };

    const overallLoading = isLoadingSystemInfo || isLoadingActivationStatus;

    return (
        <div className="min-h-screen font-inter">
            <div className="p-4 sm:p-6 flex items-center justify-center min-h-[calc(100vh-80px)]">
                <div className="w-full max-w-2xl bg-white/70 backdrop-blur-lg border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-8 text-center leading-tight">
                        <Computer className="inline-block mr-3 text-blue-600 dark:text-blue-400" size={36} />
                        System Activation Required
                    </h1>

                    <div className="bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-100 mb-4 flex items-center">
                            <Info className="mr-2" size={20} />
                            Your System Details
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center text-gray-800 dark:text-gray-200">
                                <Fingerprint className="mr-3 text-blue-600 dark:text-blue-400" size={20} />
                                <span className="font-medium">System ID:</span>
                                <span className="ml-3 text-gray-600 dark:text-gray-300 break-all">{isLoadingSystemInfo ? 'Loading...' : systemId}</span>
                                {!isLoadingSystemInfo && (
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(systemId);
                                            toast.success('System ID copied to clipboard!');
                                        }}
                                        className="ml-2 text-blue-500 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-100 transition-all duration-150"
                                        title="Copy System ID"
                                    >
                                        <Copy size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                        {overallLoading && (
                            <div className="mt-4 text-center text-blue-600 dark:text-blue-400 animate-pulse">
                                Fetching system details and activation status...
                            </div>
                        )}
                    </div>

                    <div className="bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border-gray-800 rounded-xl p-6 shadow-sm mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <Key className="mr-2 text-blue-600 dark:text-blue-400" size={20} />
                            Enter Activation Key
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input
                                type="text"
                                placeholder="Enter your activation key here"
                                value={activationKey}
                                onChange={(e) => setActivationKey(e.target.value)}
                                className="flex-grow p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/70 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-sm text-gray-900 dark:text-white shadow-inner text-base transition-all duration-200"
                                disabled={overallLoading || isActivated}
                            />
                            <button
                                onClick={handleActivate}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={overallLoading || isActivated}
                            >
                                {isActivated ? <CheckCircle className="mr-2" size={20} /> : <Key className="mr-2" size={20} />}
                                {isActivated ? 'Activated' : 'Activate'}
                            </button>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl flex items-start ${isActivated ? 'bg-green-50/70 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' : 'bg-red-50/70 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'}`}>
                            {isActivated ? <CheckCircle className="mr-3 flex-shrink-0" size={20} /> : <XCircle className="mr-3 flex-shrink-0" size={20} />}
                            <p className="text-sm font-medium leading-relaxed">{message}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SystemActivation;