import React, { useState, useEffect } from 'react';
import { Computer, Fingerprint, Key, CheckCircle, XCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast'; // Import toast for notifications

const SystemActivation = ({ onActivationSuccess }) => {
    const [motherboardSerial, setMotherboardSerial] = useState('Loading...');
    const [processorId, setProcessorId] = useState('Loading...');
    const [activationKey, setActivationKey] = useState('');
    const [message, setMessage] = useState('');
    const [isActivated, setIsActivated] = useState(false); // Default to false
    const [isLoadingSystemInfo, setIsLoadingSystemInfo] = useState(true); // Specific loading for system info
    const [isLoadingActivationStatus, setIsLoadingActivationStatus] = useState(true); // Specific loading for activation status
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'; // Base URL for the backend API

    // useEffect hook to fetch system information and initial activation status when the component mounts
    useEffect(() => {
        const fetchAllInfo = async () => {
            // Fetch System Info
            try {
                const response = await fetch(`${API_BASE_URL}/system-info`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                const data = await response.json();
                setMotherboardSerial(data.motherboardSerial);
                setProcessorId(data.processorId);
            } catch (error) {
                console.error('Error fetching system info:', error);
                setMotherboardSerial('Error fetching');
                setProcessorId('Error fetching');
                toast.error('Failed to fetch system information. Ensure the backend is running.');
            } finally {
                setIsLoadingSystemInfo(false);
            }

            try {
                const response = await fetch(`${API_BASE_URL}/check-activation`);
                const data = await response.json();
                if (response.ok && data.isActivated) {
                    setIsActivated(true);
                    setMessage('System is already activated!');
                    toast.success('System is already activated!');
                    if (onActivationSuccess) {
                        onActivationSuccess(); // Trigger navigation if already activated
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
    }, [API_BASE_URL, onActivationSuccess]); // Re-run if base URL or success callback changes

    // Function to handle the activation key submission
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

        if (motherboardSerial.startsWith('Error') || processorId.startsWith('Error')) {
            setMessage('Cannot activate: System information could not be retrieved.');
            toast.error('Cannot activate: System information could not be retrieved.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/activate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    motherboardSerial,
                    processorId,
                    activationKey,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                setIsActivated(data.success);

                if (data.success) {
                    toast.success(data.message);
                    if (onActivationSuccess) {
                        onActivationSuccess(); // Trigger navigation
                    }
                } else {
                    toast.error(`Activation failed: ${data.message}`);
                }
                setActivationKey('');
            } else {
                // Handle non-200 OK responses (HTTPExceptions from FastAPI)
                let errorMessage = 'An unknown error occurred during activation.';

                // Check if 'detail' is an object and contains a 'message' key (as per your backend's HTTPException structure)
                if (data.detail && typeof data.detail === 'object' && data.detail.message) {
                    errorMessage = data.detail.message;
                }
                // Handle cases where 'detail' might be a string (less likely with your current backend setup for custom errors)
                else if (typeof data.detail === 'string') {
                    errorMessage = data.detail;
                }
                // Fallback to a generic message if 'detail' is not as expected
                else if (data.message) { // Sometimes a top-level message might exist for non-FastAPI errors
                    errorMessage = data.message;
                }
                 else {
                    errorMessage = `HTTP error! Status: ${response.status}. Please check backend logs.`;
                }
                
                setMessage(`Activation failed: ${errorMessage}`);
                setIsActivated(false);
                toast.error(`Activation failed: ${errorMessage}`);
                console.error('Activation failed response:', data); // Log the full error data from backend
            }
        } catch (error) {
            console.error('Network error during activation:', error); // Network errors (e.g., server not running)
            setMessage('Failed to activate. Please check your network connection and ensure the backend is running.');
            setIsActivated(false);
            toast.error('Failed to activate. Check network/backend.');
        }
    };

    // Determine overall loading state for the disabled prop
    const overallLoading = isLoadingSystemInfo || isLoadingActivationStatus;

    return (
        <div className="min-h-screen font-inter">
            {/* Main content centered */}
            <div className="p-4 sm:p-6 flex items-center justify-center min-h-[calc(100vh-80px)]">
                <div className="w-full max-w-2xl bg-white/70 backdrop-blur-lg border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-8 text-center leading-tight">
                        <Computer className="inline-block mr-3 text-blue-600 dark:text-blue-400" size={36} />
                        System Activation Required
                    </h1>

                    {/* System Information Section */}
                    <div className="bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-6 shadow-sm">
                        <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-100 mb-4 flex items-center">
                            <Info className="mr-2" size={20} />
                            Your System Details
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center text-gray-800 dark:text-gray-200">
                                <Computer className="mr-3 text-blue-600 dark:text-blue-400" size={20} />
                                <span className="font-medium">Motherboard Serial:</span>
                                <span className="ml-3 text-gray-600 dark:text-gray-300 break-all">{isLoadingSystemInfo ? 'Loading...' : motherboardSerial}</span>
                            </div>
                            <div className="flex items-center text-gray-800 dark:text-gray-200">
                                <Fingerprint className="mr-3 text-blue-600 dark:text-blue-400" size={20} />
                                <span className="font-medium">Processor ID:</span>
                                <span className="ml-3 text-gray-600 dark:text-gray-300 break-all">{isLoadingSystemInfo ? 'Loading...' : processorId}</span>
                            </div>
                        </div>
                        {overallLoading && (
                            <div className="mt-4 text-center text-blue-600 dark:text-blue-400 animate-pulse">
                                Fetching system details and activation status...
                            </div>
                        )}
                    </div>

                    {/* Activation Section */}
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
                                disabled={overallLoading || isActivated} // Use overallLoading
                            />
                            <button
                                onClick={handleActivate}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={overallLoading || isActivated} // Use overallLoading
                            >
                                {isActivated ? <CheckCircle className="mr-2" size={20} /> : <Key className="mr-2" size={20} />}
                                {isActivated ? 'Activated' : 'Activate'}
                            </button>
                        </div>
                    </div>

                    {/* Message Display */}
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