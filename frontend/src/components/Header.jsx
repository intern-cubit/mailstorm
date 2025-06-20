import React, { useState, useEffect } from 'react'; // Import useEffect
import { Moon, Sun, LogOut, CheckCircle, XCircle, RefreshCcw, Power } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Header = () => {
    const { isDark, toggleTheme } = useTheme();
    const [activationStatus, setActivationStatus] = useState(null);
    const [loadingStatus, setLoadingStatus] = useState(false);

    const handleLogout = async () => {
        try {
            const response = await fetch('http://localhost:8000/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                console.log('Logged out successfully!');
                alert('You have been logged out. The application will now restart.');
                // Trigger a full app relaunch through the main process after logout
                if (window.electronAPI && window.electronAPI.reloadApp) {
                    window.electronAPI.reloadApp(); // Quits and triggers relaunch via main.js 'will-quit' handler if set up for it
                } else {
                    window.location.reload();
                }
            } else {
                console.error('Logout failed:', response.statusText);
                alert('Logout failed. Please try again.');
            }
        } catch (error) {
            console.error('Error during logout:', error);
            alert('An error occurred during logout.');
        }
    };

    const checkActivationStatus = async () => {
        setLoadingStatus(true);
        setActivationStatus(null);
        try {
            const response = await fetch('http://localhost:8000/check-activation');
            const data = await response.json();

            if (response.ok) {
                console.log('Activation status:', data.isActivated);
                setActivationStatus(data.apiStatus);
            } else {
                console.error('Failed to fetch activation status:', data.message || response.statusText);
                setActivationStatus('error');
            }
        } catch (error) {
            console.error('Error checking activation status:', error);
            setActivationStatus('error');
        } finally {
            setLoadingStatus(false);
        }
    };

    // Use useEffect to call checkActivationStatus on component mount
    useEffect(() => {
        checkActivationStatus();
    }, []); // Empty dependency array ensures it runs only once on mount

    // New handler for Reload App button
    const handleReloadApp = () => {
        if (window.electronAPI && window.electronAPI.reloadApp) {
            window.electronAPI.reloadApp();
        } else {
            console.warn("Electron API for reloading not available. Using window.location.reload().");
            window.location.reload();
        }
    };

    // New handler for Quit App button
    const handleQuitApp = () => {
        // Send a message to the main process to show the native dialog
        if (window.electronAPI && window.electronAPI.quitApp) {
            window.electronAPI.quitApp();
        } else {
            // Fallback for browser or if Electron API not available
            if (window.confirm("Are you sure you want to quit the application?")) {
                 console.warn("Electron API for quitting not available. Using browser confirm.");
                 // In a browser, this would just close the tab if allowed. In Electron, it won't quit the app directly.
            }
        }
    };

    return (
        <header className="flex justify-between items-center py-4 px-6 bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border dark:border-gray-800 shadow-sm">
            <div className="flex items-center">
                <h1 className="text-3xl font-extrabold text-[#25D366] mr-2">
                    Mail
                </h1>
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center">
                    Strom
                </span>
                <p className="hidden md:block ml-4 text-gray-600 dark:text-gray-400 text-sm">
                    Seamlessly manage your Email campaigns.
                </p>
            </div>

            <div className="flex items-center space-x-4"> {/* Container for actions */}
                {/* Activation Status */}
                <button
                    onClick={checkActivationStatus}
                    className="flex items-center p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-300 shadow-md"
                    aria-label="Check activation status"
                    disabled={loadingStatus} // Disable while loading
                >
                    {loadingStatus ? (
                        <span className="animate-spin mr-2">⚙️</span> // Simple spinner
                    ) : activationStatus === 'active' ? (
                        <CheckCircle className="text-green-500 mr-1" size={20} />
                    ) : activationStatus === 'inactive' ? (
                        <XCircle className="text-red-500 mr-1" size={20} />
                    ) : (
                        <span className="mr-1">Status</span> // Default text
                    )}
                    {loadingStatus ? 'Checking...' :
                        activationStatus === 'active' ? 'Active' :
                            activationStatus === 'inactive' ? 'Inactive' :
                                activationStatus === 'error' ? 'Error' : 'Check Status'}
                </button>

                {/* Reload App Button */}
                <button
                    onClick={handleReloadApp}
                    className="flex items-center p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-300 shadow-md"
                    aria-label="Reload Application"
                >
                    <RefreshCcw className="text-blue-500 mr-1" size={20} />
                    Reload
                </button>

                {/* Quit App Button */}
                <button
                    onClick={handleQuitApp}
                    className="flex items-center p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-300 shadow-md"
                    aria-label="Quit Application"
                >
                    <Power className="text-purple-600 mr-1" size={20} /> {/* Using Power icon for Quit */}
                    Quit
                </button>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="flex items-center p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-300 shadow-md"
                    aria-label="Logout"
                >
                    <LogOut className="text-red-600 mr-1" size={20} />
                    Logout
                </button>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-300 shadow-md"
                    aria-label="Toggle theme"
                >
                    {isDark ? <Sun className="text-yellow-400" size={20} /> : <Moon className="text-blue-800" size={20} />}
                </button>
            </div>
        </header>
    );
};

export default Header;