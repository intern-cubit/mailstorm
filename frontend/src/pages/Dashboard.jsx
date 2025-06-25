import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { MessageSquare, Send, FileText, Image, Users, Zap, CheckCircle, X, Info, Loader2, Mail, AlertCircle, ChevronLeft, ChevronRight, Settings, Edit3, Search } from 'lucide-react';

import Header from '../components/Header'; // Assuming Header is used elsewhere or will be added
import StatsCard from '../components/StatsCard';
import FileUpload from '../components/FileUpload';
import CSVPreview from '../components/CSVPreview';
import EmailContentEditor from '../components/EmailContentEditor';
import EmailConfig from '../components/EmailConfig';
import VariableButtons from '../components/VariableButtons'; // This component appears to be used implicitly in EmailContentEditor based on props
import UpdateStatus from '../components/UpdateStatus'; // This component appears to be a placeholder or for global status

function Dashboard() {
    const [currentStep, setCurrentStep] = useState(1);
    const [subject, setSubject] = useState("");
    const [message, setMessage] = ("");
    const [csvFile, setCsvFile] = useState(null);
    const [csvData, setCsvData] = useState(null);
    const [csvColumns, setCsvColumns] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [mediaFile, setMediaFile] = useState(null);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false); // For campaign send
    const [isSavingConfigs, setIsSavingConfigs] = useState(false); // New: For saving email configs
    const [showPreview, setShowPreview] = useState(false);
    const [selectedVariables, setSelectedVariables] = useState([]);

    // States for email configuration
    const [isHtmlEmail, setIsHtmlEmail] = useState(false); // Default to plain text (false)
    const [isBccMode, setIsBccMode] = useState(false);
    const [emailConfigs, setEmailConfigs] = useState([
        { senderEmail: '', senderPassword: '', smtpServer: '', smtpPort: 587 }
    ]);

    // States for campaign results
    const [successfulSends, setSuccessfulSends] = useState(0); // Count
    const [failedSends, setFailedSends] = useState(0);     // Count
    const [lastCampaignResult, setLastCampaignResult] = useState(null); // Summary object

    // States for detailed results lists
    const [successfulEmailsList, setSuccessfulEmailsList] = useState([]);
    const [failedEmailsList, setFailedEmailsList] = useState([]);
    const [showDetailedResults, setShowDetailedResults] = useState(false);

    // NEW: States for filtering and searching emails
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'successful', 'failed'
    const [searchTerm, setSearchTerm] = useState('');

    // NEW: Toast notification state
    const [toastMessage, setToastMessage] = useState(null); // { type: 'success' | 'error', message: '...' }

    // Helper function to show toast messages
    const showToast = useCallback((type, message) => {
        setToastMessage({ type, message });
        const timer = setTimeout(() => {
            setToastMessage(null);
        }, 5000); // Hide after 5 seconds
        return () => clearTimeout(timer);
    }, []);


    // --- Backend API Integration for Email Configurations ---
    // Load email configurations from backend on component mount
    useEffect(() => {
        const loadConfigs = async () => {
            try {
                const response = await fetch('http://localhost:8000/load-email-configs');
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Failed to load email configurations from backend.');
                }
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    setEmailConfigs(data);
                } else {
                    // If no configs are loaded, ensure there's at least one default
                    setEmailConfigs([{ senderEmail: '', senderPassword: '', smtpServer: '', smtpPort: 587 }]);
                }
            } catch (err) {
                console.error("Error loading email configurations:", err.message);
                setError("Failed to load saved email configurations: " + err.message);
                showToast('error', "Failed to load saved email configurations.");
                // Still ensure a default config is present even if loading fails
                setEmailConfigs([{ senderEmail: '', senderPassword: '', smtpServer: '', smtpPort: 587 }]);
            }
        };

        loadConfigs();
    }, [showToast]); // Include showToast in dependencies to satisfy useCallback linter, though it's stable


    // NEW: Function to handle saving email configurations manually
    const handleSaveEmailConfigs = async () => {
        setError("");
        setStatus("");
        setIsSavingConfigs(true); // Start loading state for saving

        // Basic validation before saving
        const invalidConfigs = emailConfigs.some(config =>
            !config.senderEmail || !config.senderPassword || !config.smtpServer || !config.smtpPort
        );
        if (invalidConfigs) {
            setError("Please fill in all details for all sender email configurations before saving.");
            showToast('error', "Please fill in all details for all sender email configurations.");
            setIsSavingConfigs(false);
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/save-email-configs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(emailConfigs),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to save email configurations to backend.');
            }
            setStatus("✅ Email configurations saved successfully!");
            showToast('success', "Email configurations saved successfully!");
        } catch (err) {
            console.error("Error saving email configurations:", err.message);
            setError("❌ Failed to save email configurations: " + err.message);
            showToast('error', `Failed to save configurations: ${err.message}`);
        } finally {
            setIsSavingConfigs(false); // End loading state
        }
    };
    // --- End Backend API Integration ---

    const steps = [
        { id: 1, title: "Upload Emails", icon: FileText, description: "Import your contact list" },
        { id: 2, title: "Email Settings", icon: Settings, description: "Configure sender details" },
        { id: 3, title: "Create & Send", icon: Send, description: "Write and launch campaign" }
    ];

    // Update selected variables when message or subject changes
    useEffect(() => {
        const extractVariables = (text) => {
            if (!text) return [];
            const regex = /{([a-zA-Z_][a-zA-Z0-9_]*)}/g;
            const matches = text.match(regex);
            if (matches) {
                return matches.map(v => v.slice(1, -1));
            }
            return [];
        };

        const messageVars = extractVariables(message);
        const subjectVars = extractVariables(subject);

        setSelectedVariables(Array.from(new Set([...messageVars, ...subjectVars])));
    }, [message, subject]);

    const handleToggleHtml = useCallback((isHtml) => {
        setIsHtmlEmail(isHtml);
        if (!isHtml) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = message;
            setMessage(tempDiv.innerText);
        }
    }, [message]);

    const handleCsvUpload = useCallback(async (e) => {
        const file = e.target.files[0];
        e.target.value = null; // Clear the input so the same file can be selected again

        setError("");
        setStatus("");
        setIsLoading(true);
        setCsvData(null);
        setCsvColumns([]);
        setTotalRows(0);
        setShowPreview(false);
        setCsvFile(null);

        if (!file) {
            setIsLoading(false);
            return;
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            setError("Please upload a CSV file (e.g., Emails.csv).");
            showToast('error', "Please upload a CSV file.");
            setIsLoading(false);
            return;
        }

        setCsvFile(file);
        setStatus("Processing CSV file...");

        try {
            const formData = new FormData();
            formData.append('csv_file', file);

            const response = await fetch('http://localhost:8000/preview-csv', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to process CSV. Please check file format.');
            }

            const result = await response.json();
            setCsvData(result.preview);
            setCsvColumns(result.columns);
            setShowPreview(true);
            setTotalRows(result.total_rows || 0);
            setStatus(`CSV processed successfully! ${result.total_rows} Emails found.`);
            showToast('success', `CSV processed! ${result.total_rows} Emails found.`);


            if (result.columns.some(col => col.toLowerCase() === 'email')) {
                const emailCol = result.columns.find(col => col.toLowerCase() === 'email');
                setSelectedVariables(prev => (prev.includes(emailCol) ? prev : [...prev, emailCol]));
            } else {
                setError("Your CSV file must contain an 'email' column.");
                showToast('error', "CSV must contain an 'email' column.");
            }

        } catch (err) {
            setError("Error processing CSV: " + err.message);
            showToast('error', "Error processing CSV: " + err.message);
            setCsvFile(null);
            setCsvData(null);
            setCsvColumns([]);
            setShowPreview(false);
            setStatus("");
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    const handleMediaUpload = useCallback((e) => {
        const file = e.target.files[0];
        setMediaFile(file || null);
        e.target.value = null; // Clear the input
    }, []);

    const insertVariableIntoMessage = useCallback((variable) => {
        const newVar = `{${variable}}`;
        const textarea = document.getElementById('email-message-textarea');
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newText = message.substring(0, start) + newVar + message.substring(end);
            setMessage(newText);
            // Manually set cursor position after insertion
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + newVar.length;
                textarea.focus();
            }, 0);
        } else {
            setMessage(prev => prev + newVar);
        }
    }, [message, setMessage]);

    const insertVariableIntoSubject = useCallback((variable) => {
        const newVar = `{${variable}}`;
        const input = document.getElementById('email-subject');
        if (input) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const newText = subject.substring(0, start) + newVar + subject.substring(end);
            setSubject(newText);
            // Manually set cursor position after insertion
            setTimeout(() => {
                input.selectionStart = input.selectionEnd = start + newVar.length;
                input.focus();
            }, 0);
        } else {
            setSubject(prev => prev + newVar);
        }
    }, [subject, setSubject]);

    const handleSubmit = async () => {
        setError("");
        setStatus("");
        setIsLoading(true);
        setLastCampaignResult(null);
        setSuccessfulEmailsList([]);
        setFailedEmailsList([]);
        setShowDetailedResults(false);
        setFilterStatus('all'); // Reset filter
        setSearchTerm(''); // Reset search term

        if (!csvFile) {
            setError("Please upload your Contact List (CSV) first.");
            showToast('error', "Please upload your Contact List.");
            setIsLoading(false);
            return;
        }
        if (!subject.trim()) {
            setError("Email subject cannot be empty.");
            showToast('error', "Email subject cannot be empty.");
            setIsLoading(false);
            return;
        }
        if (!message.trim()) {
            setError("Email body cannot be empty.");
            showToast('error', "Email body cannot be empty.");
            setIsLoading(false);
            return;
        }
        if (!csvColumns.some(col => col.toLowerCase() === 'email')) {
            setError("Your CSV file must contain an 'email' column for sending emails.");
            showToast('error', "CSV must contain an 'email' column.");
            setIsLoading(false);
            return;
        }
        const missingVars = selectedVariables.filter(v => !csvColumns.includes(v));
        if (missingVars.length > 0) {
            setError(`You have variables in your email content/subject that do not match CSV columns: ${missingVars.join(', ')}. Please check.`);
            showToast('error', `Missing CSV columns for variables: ${missingVars.join(', ')}.`);
            setIsLoading(false);
            return;
        }

        // Validate all email configurations
        const invalidConfigs = emailConfigs.some(config =>
            !config.senderEmail || !config.senderPassword || !config.smtpServer || !config.smtpPort
        );
        if (invalidConfigs) {
            setError("Please fill in all details for all sender email configurations.");
            showToast('error', "Please fill in all sender email configuration details.");
            setIsLoading(false);
            return;
        }

        // Determine if content is HTML by checking the isHtmlEmail state or by looking for HTML tags
        const actualHtmlContent = isHtmlEmail || /<[a-z][\s\S]*>/i.test(message);

        const formData = new FormData();
        formData.append("subject", subject);
        formData.append("message", message);
        formData.append("csv_file", csvFile);
        formData.append("variables", JSON.stringify(selectedVariables));
        formData.append("email_configs", JSON.stringify(emailConfigs));
        formData.append("html_content", actualHtmlContent);
        formData.append("bcc_mode", isBccMode);

        if (mediaFile) {
            formData.append("media_file", mediaFile);
        }

        try {
            setStatus("Sending campaign... This may take a while. Please do not close this window.");
            const response = await fetch("http://localhost:8000/send-emails", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Server responded with an error.");
            }

            const result = await response.json();
            setStatus(`✅ Campaign completed successfully! ${result.detail}`);
            showToast('success', `Campaign completed! ${result.successful_emails.length} successful, ${result.failed_emails.length} failed.`);
            setSuccessfulSends(result.successful_emails.length);
            setFailedSends(result.failed_emails.length);

            setSuccessfulEmailsList(result.successful_emails);
            setFailedEmailsList(result.failed_emails);
            setShowDetailedResults(true);

            setLastCampaignResult({
                successful: result.successful_emails.length,
                failed: result.failed_emails.length,
                total: result.successful_emails.length + result.failed_emails.length,
                timestamp: new Date().toLocaleString()
            });

        } catch (err) {
            setError("❌ Failed to send campaign: " + err.message);
            showToast('error', "Failed to send campaign: " + err.message);
            setStatus("");
            setSuccessfulSends(0);
            setFailedSends(0);
            setSuccessfulEmailsList([]);
            setFailedEmailsList([]);
            setShowDetailedResults(false);
        } finally {
            setIsLoading(false);
        }
    };

    const canProceedToNextStep = () => {
        switch (currentStep) {
            case 1:
                return csvFile && csvData && csvColumns.some(col => col.toLowerCase() === 'email');
            case 2:
                // Ensure there's at least one config and all its fields are filled
                return emailConfigs.length > 0 && emailConfigs.every(config =>
                    config.senderEmail &&
                    config.senderPassword &&
                    config.smtpServer &&
                    config.smtpPort
                );
            case 3:
                return subject.trim() && message.trim();
            default:
                return false;
        }
    };

    const nextStep = () => {
        if (currentStep < steps.length && canProceedToNextStep()) {
            setCurrentStep(currentStep + 1);
            setError(""); // Clear error when moving to next step
        } else if (!canProceedToNextStep()) {
            // Set a specific error if conditions aren't met for the current step
            if (currentStep === 1) {
                setError("Please upload a valid CSV file with an 'email' column.");
                showToast('error', "Please upload a valid CSV file.");
            } else if (currentStep === 2) {
                setError("Please complete all sender email configuration details.");
                showToast('error', "Please complete all sender email configuration details.");
            } else if (currentStep === 3) {
                setError("Please ensure both subject and message are filled.");
                showToast('error', "Please ensure both subject and message are filled.");
            }
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            setError(""); // Clear error when moving back
        }
    };

    const goToStep = (stepNumber) => {
        // Allow going to any previous step, but only to next if canProceedToNextStep is true
        if (stepNumber < currentStep) {
            setCurrentStep(stepNumber);
            setError("");
        } else if (stepNumber === currentStep + 1 && canProceedToNextStep()) {
            setCurrentStep(stepNumber);
            setError("");
        } else if (stepNumber === currentStep) {
            // Allow clicking current step to reset errors if user fixes something
            setError("");
        }
        // Disallow jumping forward if not ready
    };

    // NEW: Function to filter and search emails
    const filterAndSearchEmails = useCallback(() => {
        let emailsToDisplay = [];

        if (filterStatus === 'successful') {
            emailsToDisplay = successfulEmailsList;
        } else if (filterStatus === 'failed') {
            emailsToDisplay = failedEmailsList;
        } else { // 'all'
            emailsToDisplay = [...successfulEmailsList, ...failedEmailsList];
        }

        if (searchTerm) {
            const lowerCaseSearchTerm = searchTerm.toLowerCase();
            emailsToDisplay = emailsToDisplay.filter(email =>
                email.toLowerCase().includes(lowerCaseSearchTerm)
            );
        }
        return emailsToDisplay;
    }, [filterStatus, searchTerm, successfulEmailsList, failedEmailsList]);

    const displayedEmails = useMemo(() => filterAndSearchEmails(), [filterAndSearchEmails]);


    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Upload Your Emails</h2>
                            <p className="text-gray-600 dark:text-gray-400">Import your contact list and optional media files</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <FileUpload
                                    title="Contact List (CSV)"
                                    description="Upload your Emails. Must contain an 'email' column."
                                    icon={FileText}
                                    file={csvFile}
                                    acceptedTypes=".csv"
                                    onFileUpload={handleCsvUpload}
                                    isLoading={isLoading}
                                />

                                <FileUpload
                                    title="Media Attachment (Optional)"
                                    description="Attach an image, video, or document."
                                    icon={Image}
                                    file={mediaFile}
                                    acceptedTypes="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                                    onFileUpload={handleMediaUpload}
                                    isLoading={isLoading} // Optionally disable during upload
                                />

                                <div className="bg-blue-50/70 backdrop-blur-sm border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 rounded-xl p-6">
                                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                                        <Info className="mr-2" size={18} /> Requirements
                                    </h4>
                                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-disc pl-5">
                                        <li>CSV file must contain an 'email' column</li>
                                        <li>Supported formats: .csv files only</li>
                                        <li>Media files: images, videos, PDFs, or documents</li>
                                        <li>Preview your Emails before proceeding</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="">
                                {showPreview && csvData ? (
                                    <CSVPreview
                                        data={csvData}
                                        columns={csvColumns}
                                        totalRows={totalRows}
                                        onClose={() => {
                                            setShowPreview(false);
                                            setCsvData(null);
                                            setCsvColumns([]);
                                            setTotalRows(0);
                                            setCsvFile(null);
                                            setStatus("");
                                            setError("");
                                        }}
                                    />
                                ) : (
                                    <div className="text-center p-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl">
                                        <FileText className="mx-auto mb-4 text-gray-400" size={48} />
                                        <p className="text-gray-500 dark:text-gray-400">Upload a CSV file to see preview</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Email Configuration</h2>
                            <p className="text-gray-600 dark:text-gray-400">Set up your sender email and SMTP settings</p>
                        </div>

                        <EmailConfig
                            emailConfigs={emailConfigs}
                            onEmailConfigsChange={setEmailConfigs}
                        />

                        {/* NEW: Remember Emails Button */}
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handleSaveEmailConfigs}
                                disabled={isSavingConfigs || emailConfigs.some(config => !config.senderEmail || !config.senderPassword || !config.smtpServer || !config.smtpPort)}
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
                                        Remember Emails
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create & Send Campaign</h2>
                            <p className="text-gray-600 dark:text-gray-400">Write your email content and launch the campaign</p>
                        </div>

                        {/* Email Content Editor */}
                        <div className="mb-8">
                            <EmailContentEditor
                                subject={subject}
                                onSubjectChange={setSubject}
                                message={message}
                                isHtmlEmail={isHtmlEmail}
                                onToggleHtml={handleToggleHtml}
                                onMessageChange={setMessage}
                                columns={csvColumns}
                                onInsertVariable={insertVariableIntoMessage}
                                onInsertSubjectVariable={insertVariableIntoSubject}
                                selectedVariables={selectedVariables}
                                isBccMode={isBccMode}
                                onToggleBcc={setIsBccMode}
                            />
                        </div>

                        {/* Campaign Summary */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Campaign Summary</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">Emails:</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{totalRows || 0} recipients</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">Subject:</p>
                                    <p className="font-medium text-gray-900 dark:text-white truncate">{subject || "No subject"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">Sender Configurations:</p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {emailConfigs.length > 0
                                            ? `${emailConfigs.length} configuration(s) added`
                                            : "Not configured"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">Variables Used:</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{selectedVariables.length} variables</p>
                                </div>
                            </div>
                        </div>

                        {/* Stats - COLOR CHANGE HERE */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <StatsCard icon={Users} label="Total Emails" value={totalRows || 0} color="bg-blue-600" />
                            <StatsCard icon={MessageSquare} label="Unique Variables" value={selectedVariables.length} color="bg-indigo-600" />
                            <StatsCard icon={Mail} label="Successful Sends" value={successfulSends} color="bg-green-600" /> {/* Changed to green */}
                            <StatsCard icon={X} label="Failed Sends" value={failedSends} color="bg-red-600" />
                        </div>

                        {/* Last Campaign Results Summary - COLOR CHANGE HERE */}
                        {lastCampaignResult && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-600/20 dark:to-emerald-600/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-6">
                                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-4 flex items-center">
                                    <CheckCircle className="mr-2" size={18} /> Last Campaign Results Summary
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{lastCampaignResult.successful}</div> {/* Green */}
                                        <div className="text-gray-600 dark:text-gray-400">Successful</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{lastCampaignResult.failed}</div>
                                        <div className="text-gray-600 dark:text-gray-400">Failed</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{lastCampaignResult.total}</div> {/* Blue */}
                                        <div className="text-gray-600 dark:text-gray-400">Total Processed</div> {/* Clarified label */}
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{lastCampaignResult.timestamp}</div>
                                        <div className="text-gray-600 dark:text-gray-400">Completed On</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDetailedResults(prev => !prev)}
                                    className="mt-4 w-full flex items-center justify-center py-2 px-4 border border-purple-300 dark:border-purple-700 rounded-lg text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
                                >
                                    {showDetailedResults ? (
                                        <>
                                            <ChevronLeft className="mr-2" size={16} /> Hide Detailed Results
                                        </>
                                    ) : (
                                        <>
                                            Show Detailed Results <ChevronRight className="ml-2" size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* NEW: Detailed Results Section with Filtering and Search */}
                        {showDetailedResults && lastCampaignResult && (
                            <div className="bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border-gray-800 rounded-2xl shadow-xl p-6">
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                    <Mail className="mr-2" size={20} /> All Campaign Emails
                                </h3>

                                {/* Filter and Search Controls */}
                                <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                                    <div className="relative flex-grow w-full sm:w-auto">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search email address..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border bg-white/70 backdrop-blur-sm border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border-gray-800 rounded-lg shadow-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    <div className="flex space-x-2 w-full sm:w-auto justify-center">
                                        <button
                                            onClick={() => setFilterStatus('all')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'all'
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[rgba(40,40,40,0.5)]'
                                                }`}
                                        >
                                            All ({successfulEmailsList.length + failedEmailsList.length})
                                        </button>
                                        <button
                                            onClick={() => setFilterStatus('successful')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'successful'
                                                ? 'bg-green-600 text-white shadow-md'
                                                : 'bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[rgba(40,40,40,0.5)]'
                                                }`}
                                        >
                                            Successful ({successfulEmailsList.length})
                                        </button>
                                        <button
                                            onClick={() => setFilterStatus('failed')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'failed'
                                                ? 'bg-red-600 text-white shadow-md'
                                                : 'bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[rgba(40,40,40,0.5)]'
                                                }`}
                                        >
                                            Failed ({failedEmailsList.length})
                                        </button>
                                    </div>
                                </div>

                                {/* Displayed Emails List */}
                                <div className="max-h-80 overflow-y-auto text-sm bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border dark:border-gray-800 rounded-lg p-4 shadow-md custom-scrollbar">
                                    {displayedEmails.length > 0 ? (
                                        <ul className="space-y-1">
                                            {displayedEmails.map((email, idx) => (
                                                <li key={idx} className={`flex items-center ${successfulEmailsList.includes(email) ? 'text-green-700 dark:text-green-300' : failedEmailsList.includes(email) ? 'text-red-700 dark:text-red-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                                    {successfulEmailsList.includes(email) && <CheckCircle size={14} className="mr-2 text-green-500" />}
                                                    {failedEmailsList.includes(email) && <X size={14} className="mr-2 text-red-500" />}
                                                    {email}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">No emails found matching the criteria.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Send Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={
                                isLoading ||
                                !csvFile ||
                                !subject.trim() ||
                                !message.trim() ||
                                (selectedVariables.length > 0 && !selectedVariables.every(v => csvColumns.includes(v))) ||
                                emailConfigs.length === 0 || // Ensure at least one config exists
                                emailConfigs.some(config => !config.senderEmail || !config.senderPassword || !config.smtpServer || !config.smtpPort) // Validate all configs
                            }
                            className="w-full px-8 py-6 bg-gradient-to-r from-teal-500 to-green-600 text-white text-2xl font-bold rounded-xl hover:from-teal-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center transform hover:-translate-y-1"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-4 animate-spin" size={32} />
                                    Sending Campaign...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-4" size={32} />
                                    Launch Campaign
                                </>
                            )}
                        </button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-transparent">
            {/* Toast Notification */}
            {toastMessage && (
                <div
                    className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3 transition-opacity duration-300 ${
                        toastMessage.type === 'success'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                    }`}
                    role="alert"
                >
                    {toastMessage.type === 'success' ? (
                        <CheckCircle size={20} className="flex-shrink-0" />
                    ) : (
                        <AlertCircle size={20} className="flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium">{toastMessage.message}</span>
                </div>
            )}

            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <UpdateStatus />

                {/* Status Messages - Kept for broader status/error, but individual actions use toast now */}
                {(status || error) && (
                    <div className="mb-6">
                        <div className={`rounded-xl p-4 transition-all duration-300 ${error ? 'bg-red-50/70 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                            (status.startsWith("✅") ? 'bg-green-50/70 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                                'bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800')
                            }`}>
                            <div className="flex items-center">
                                {error ? <AlertCircle className="text-red-600 dark:text-red-400 mr-2" size={20} /> :
                                    (status.startsWith("✅") ? <CheckCircle className="text-green-600 dark:text-green-400 mr-2" size={20} /> :
                                        <Info className="text-blue-600 dark:text-blue-400 mr-2" size={20} />)}
                                <p className={`font-medium ${error ? 'text-red-800 dark:text-red-200' :
                                    (status.startsWith("✅") ? 'text-green-800 dark:text-green-200' :
                                        'text-blue-800 dark:text-blue-200')
                                    }`}>
                                    {error || status}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step Progress Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-center mb-4">
                        {steps.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <button
                                    onClick={() => goToStep(step.id)}
                                    // Disable step navigation if saving configs or loading for campaign
                                    disabled={isSavingConfigs || isLoading}
                                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${currentStep === step.id
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : currentStep > step.id
                                            ? 'bg-green-600 border-green-600 text-white'
                                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                                        } ${isSavingConfigs || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {currentStep > step.id ? (
                                        <CheckCircle size={20} />
                                    ) : (
                                        <step.icon size={20} />
                                    )}
                                </button>
                                {index < steps.length - 1 && (
                                    <div className={`w-24 h-1 mx-4 rounded-full transition-all duration-300 ${currentStep > step.id ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                                        }`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {steps[currentStep - 1]?.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {steps[currentStep - 1]?.description}
                        </p>
                    </div>
                </div>


                {/* Main Content Card */}
                <div className="bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border-gray-800 rounded-2xl shadow-xl lg:p-8 md:p-4 p-2 min-h-[600px]">
                    {renderStepContent()}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center mt-8">
                    <button
                        onClick={prevStep}
                        // Disable if at first step or saving configs or loading for campaign
                        disabled={currentStep === 1 || isSavingConfigs || isLoading}
                        className="flex items-center px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        <ChevronLeft className="mr-2" size={20} />
                        Previous
                    </button>

                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Step {currentStep} of {steps.length}
                    </div>

                    <button
                        onClick={nextStep}
                        // Disable if at last step, cannot proceed, or saving configs, or loading for campaign
                        disabled={currentStep === 3 || !canProceedToNextStep() || isSavingConfigs || isLoading}
                        className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        Next
                        <ChevronRight className="ml-2" size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;