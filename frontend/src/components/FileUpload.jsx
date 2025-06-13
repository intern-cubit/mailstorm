import React from 'react';
import { Upload, FileText, Image, CheckCircle, X } from 'lucide-react';

const FileUpload = ({ onFileUpload, file, acceptedTypes, title, description, icon: Icon }) => {
    const inputId = title.replace(/\s+/g, '-').toLowerCase();

    const handleRemoveFile = () => {
        // Create a synthetic event to clear the file
        const syntheticEvent = {
            target: {
                files: [],
                value: null
            }
        };
        onFileUpload(syntheticEvent);
    };

    return (
        <div className="relative bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Icon className="mr-2 text-blue-600 dark:text-blue-400" size={20} />
                {title}
            </h3>

            <label
                htmlFor={inputId}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer 
                   hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 
                   flex flex-col justify-center items-center min-h-[120px]
                   ${file ? 'border-green-400 dark:border-green-600 bg-green-50/70 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/30'}`
                }
            >
                {file ? (
                    <div className="flex flex-col items-center w-full">
                        <CheckCircle className="text-green-600 dark:text-green-400 mb-3" size={32} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 break-all px-2 text-center">
                            {file.name}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center justify-center space-x-4">
                            <span>{(file.size / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span className="text-green-600 dark:text-green-400">Ready to use</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <Upload className="text-gray-400 dark:text-gray-500 mb-3" size={32} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Click to upload or drag & drop
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                            {description}
                        </p>
                    </div>
                )}

                <input
                    id={inputId}
                    type="file"
                    accept={acceptedTypes}
                    onChange={onFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </label>

            {file && (
                <button
                    onClick={handleRemoveFile}
                    className="absolute top-2 right-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 p-2 rounded-full bg-white/80 dark:bg-gray-800/80 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-600 shadow-sm transition-all duration-200"
                    aria-label="Remove file"
                    title="Remove file"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

export default FileUpload;