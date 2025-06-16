import React, { useState, useEffect } from 'react';

const UpdateStatus = () => {
    const [updateStatus, setUpdateStatus] = useState('Checking for updates...');
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateDownloaded, setUpdateDownloaded] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [newVersion, setNewVersion] = useState('');
    const [downloadStarted, setDownloadStarted] = useState(false);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.onUpdateStatus((message) => {
                setUpdateStatus(message);
            });

            window.electronAPI.onUpdateAvailable((version) => {
                setUpdateAvailable(true);
                setNewVersion(version);
                setUpdateStatus(`Update v${version} available. Click 'Download & Install' to begin.`);
            });

            window.electronAPI.onUpdateProgress((percent) => {
                setDownloadProgress(percent);
                setUpdateStatus(`Downloading update: ${percent.toFixed(0)}%`);
            });

            window.electronAPI.onUpdateDownloaded(() => {
                setUpdateDownloaded(true);
                setDownloadStarted(false);
                setUpdateStatus('Update downloaded. Ready to install.');
            });
        } else {
            // Only set this status if not in Electron, otherwise it should remain 'Checking for updates...'
            // and hide the component until a specific update status is received.
            setUpdateStatus('Not running in Electron environment (updates disabled).');
        }
    }, []);

    const handleDownloadUpdate = () => {
        if (window.electronAPI && updateAvailable) {
            setDownloadStarted(true);
            setUpdateStatus(`Starting download for v${newVersion}...`);
            window.electronAPI.downloadUpdate();
        }
    };

    const handleRestartApp = () => {
        if (window.electronAPI && updateDownloaded) {
            window.electronAPI.restartApp();
        }
    };

    // Render the component only if an update is available, downloaded, download has started,
    // or if it's explicitly stating it's not in an Electron environment (for development feedback).
    const shouldShowUpdateStatus = updateAvailable || updateDownloaded || downloadStarted || updateStatus.includes('Not running in Electron environment');

    if (!shouldShowUpdateStatus) {
        return null; // Don't render anything if no update is found and not actively processing
    }

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
                        backgroundColor: '#28a745',
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