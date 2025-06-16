import React, { useState, useEffect } from 'react';

const UpdateStatus = () => {
    const [updateStatus, setUpdateStatus] = useState('Checking for updates...');
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateDownloaded, setUpdateDownloaded] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [newVersion, setNewVersion] = useState('');
    const [downloadStarted, setDownloadStarted] = useState(false); // New state to track download initiation

    useEffect(() => {
        // Ensure electronAPI is available (only in Electron environment)
        if (window.electronAPI) {
            window.electronAPI.onUpdateStatus((message) => {
                setUpdateStatus(message);
            });

            window.electronAPI.onUpdateAvailable((version) => {
                setUpdateAvailable(true);
                setNewVersion(version);
                // Status updated to prompt user to click download button
                setUpdateStatus(`Update v${version} available. Click 'Download & Install' to begin.`);
            });

            window.electronAPI.onUpdateProgress((percent) => {
                setDownloadProgress(percent);
                setUpdateStatus(`Downloading update: ${percent.toFixed(0)}%`);
            });

            window.electronAPI.onUpdateDownloaded(() => {
                setUpdateDownloaded(true);
                setDownloadStarted(false); // Reset downloadStarted as download is complete
                setUpdateStatus('Update downloaded. Ready to install.');
            });
        } else {
            setUpdateStatus('Not running in Electron environment (updates disabled).');
        }
    }, []);

    const handleDownloadUpdate = () => {
        if (window.electronAPI && updateAvailable) {
            setDownloadStarted(true); // Indicate that download has been initiated
            setUpdateStatus(`Starting download for v${newVersion}...`);
            window.electronAPI.downloadUpdate(); // Trigger the download
        }
    };

    const handleRestartApp = () => {
        if (window.electronAPI && updateDownloaded) {
            window.electronAPI.restartApp();
        }
    };

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', borderRadius: '8px' }}>
            <h2>App Update Status</h2>
            <p>{updateStatus}</p>

            {updateAvailable && !downloadStarted && !updateDownloaded && (
                <button
                    onClick={handleDownloadUpdate}
                    style={{
                        marginTop: '10px',
                        padding: '10px 15px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Download & Install Update (v{newVersion})
                </button>
            )}

            {downloadStarted && !updateDownloaded && (
                <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '5px', marginTop: '10px' }}>
                    <div
                        style={{
                            width: `${downloadProgress}%`,
                            backgroundColor: '#4CAF50',
                            height: '20px',
                            borderRadius: '5px',
                            textAlign: 'center',
                            lineHeight: '20px',
                            color: 'white'
                        }}
                    >
                        {downloadProgress.toFixed(0)}%
                    </div>
                </div>
            )}

            {updateDownloaded && (
                <button
                    onClick={handleRestartApp}
                    style={{
                        marginTop: '10px',
                        padding: '10px 15px',
                        backgroundColor: '#28a745', // Green color for restart button
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Restart & Install Update (v{newVersion})
                </button>
            )}
        </div>
    );
};

export default UpdateStatus;