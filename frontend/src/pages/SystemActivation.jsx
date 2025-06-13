import React, { useState, useEffect } from 'react';
import { Computer, Fingerprint, Key, CheckCircle, XCircle, Info } from 'lucide-react';

const SystemActivation = ({ onActivationSuccess }) => {
    // State variables to store system information, activation key, and messages
    const [motherboardSerial, setMotherboardSerial] = useState('Loading...');
    const [processorId, setProcessorId] = useState('Loading...');
    const [activationKey, setActivationKey] = useState('');
    const [message, setMessage] = useState('');
    const [isActivated, setIsActivated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'; // Base URL for the backend API

    // useEffect hook to fetch system information when the component mounts
    useEffect(() => {
        // Function to fetch system details from the backend
        const fetchSystemInfo = async () => {
            try {
                // Fetch data from the /system-info endpoint
                const response = await fetch('http://localhost:8000/system-info', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                const data = await response.json();

                // Update state with fetched data
                setMotherboardSerial(data.motherboardSerial);
                setProcessorId(data.processorId);
                setMessage(''); // Clear any previous messages
            } catch (error) {
                // Handle errors during fetching
                console.error('Error fetching system info:', error);
                setMotherboardSerial('Error fetching');
                setProcessorId('Error fetching');
                setMessage('Failed to fetch system information. Ensure the backend is running.');
            } finally {
                setIsLoading(false); // Set loading to false after fetch attempt
            }
        };

        fetchSystemInfo(); // Call the fetch function
    }, []); // Empty dependency array means this runs once on mount

    // Function to handle the activation key submission
    const handleActivate = async () => {
        if (!activationKey) {
            setMessage('Please enter an activation key.');
            return;
        }

        // Prevent activation attempt if system info is not fully loaded or has errors
        if (motherboardSerial.startsWith('Error') || processorId.startsWith('Error') || isLoading) {
            setMessage('System information is not fully loaded or there was an error. Please wait or refresh.');
            return;
        }

        try {
            // Send activation request to the backend
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
            setMessage(data.message); // Display the message from the backend
            setIsActivated(data.success); // Update local activation status based on backend response

            // If activation was successful, notify the parent component (App)
            if (data.success && onActivationSuccess) {
                onActivationSuccess();
            }
        } catch (error) {
            // Handle network or other errors during activation
            console.error('Error during activation:', error);
            setMessage('Failed to activate. Please check your connection and try again.');
            setIsActivated(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-950 p-4 sm:p-6 flex items-center justify-center font-inter">
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
                            <span className="ml-3 text-gray-600 dark:text-gray-300 break-all">{isLoading ? 'Loading...' : motherboardSerial}</span>
                        </div>
                        <div className="flex items-center text-gray-800 dark:text-gray-200">
                            <Fingerprint className="mr-3 text-blue-600 dark:text-blue-400" size={20} />
                            <span className="font-medium">Processor ID:</span>
                            <span className="ml-3 text-gray-600 dark:text-gray-300 break-all">{isLoading ? 'Loading...' : processorId}</span>
                        </div>
                    </div>
                    {isLoading && (
                        <div className="mt-4 text-center text-blue-600 dark:text-blue-400 animate-pulse">
                            Fetching system details...
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
                            disabled={isLoading || isActivated}
                        />
                        <button
                            onClick={handleActivate}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading || isActivated}
                        >
                            {isActivated ? <CheckCircle className="mr-2" size={20} /> : <Key className="mr-2" size={20} />}
                            {isActivated ? 'Activated' : 'Activate'}
                        </button>
                    </div>
                </div>

                {/* Message Display */}
                {message && (
                    <div className={`mt-4 p-4 rounded-xl flex items-center ${isActivated ? 'bg-green-50/70 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200' : 'bg-red-50/70 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'}`}>
                        {isActivated ? <CheckCircle className="mr-3" size={20} /> : <XCircle className="mr-3" size={20} />}
                        <p className="text-sm font-medium">{message}</p>
                    </div>
                )}

                {/* Note about OS compatibility */}
                <div className="mt-6 p-4 bg-gray-50/70 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 flex items-start">
                    <Info className="mr-3 flex-shrink-0 text-gray-500 dark:text-gray-400" size={16} />
                    <p>
                        This application uses Windows-specific commands (`wmic`) to retrieve system information.
                        It will only work correctly on a Windows operating system.
                        For Linux or macOS, different commands would be required in the backend.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SystemActivation;
