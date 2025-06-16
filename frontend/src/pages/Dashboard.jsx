import React, { useState, useCallback, useEffect } from 'react';
import { MessageSquare, Send, FileText, Image, Users, Zap, CheckCircle, X, Info, Loader2, Mail, AlertCircle, ChevronLeft, ChevronRight, Settings, Edit3 } from 'lucide-react';

import Header from '../components/Header';
import StatsCard from '../components/StatsCard';
import FileUpload from '../components/FileUpload';
import CSVPreview from '../components/CSVPreview';
import EmailContentEditor from '../components/EmailContentEditor';
import EmailConfig from '../components/EmailConfig';
import VariableButtons from '../components/VariableButtons';
import UpdateStatus from '../components/UpdateStatus';

function Dashboard() {
    const [currentStep, setCurrentStep] = useState(1);
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState(""); // Holds either plain text or HTML string
    const [csvFile, setCsvFile] = useState(null);
    const [csvData, setCsvData] = useState(null);
    const [csvColumns, setCsvColumns] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    const [mediaFile, setMediaFile] = useState(null);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [selectedVariables, setSelectedVariables] = useState([]);

    // New states for email configuration
    const [senderEmail, setSenderEmail] = useState("");
    const [senderPassword, setSenderPassword] = useState("");
    const [smtpServer, setSmtpServer] = useState("");
    const [smtpPort, setSmtpPort] = useState(587); // Default to TLS port
    const [isHtmlEmail, setIsHtmlEmail] = useState(false); // Default to plain text (false)
    const [isBccMode, setIsBccMode] = useState(false);

    // New states for send results
    const [successfulSends, setSuccessfulSends] = useState(0);
    const [failedSends, setFailedSends] = useState(0);
    const [lastCampaignResult, setLastCampaignResult] = useState(null);

    const steps = [
        { id: 1, title: "Upload Contacts", icon: FileText, description: "Import your contact list" },
        { id: 2, title: "Email Settings", icon: Settings, description: "Configure sender details" },
        { id: 3, title: "Create & Send", icon: Send, description: "Write and launch campaign" }
    ];

    // Update selected variables when message or subject changes
    useEffect(() => {
        // Extract variables from both message and subject, regardless of HTML or plain text
        const extractVariables = (text) => {
            if (!text) return [];
            // Regex to find {variable} patterns.
            // It ensures variable name starts with a letter or underscore,
            // and contains only alphanumeric characters or underscores.
            const regex = /{([a-zA-Z_][a-zA-Z0-9_]*)}/g;
            const matches = text.match(regex);
            if (matches) {
                // Map to get just the captured group (the variable name without braces)
                return matches.map(v => v.slice(1, -1));
            }
            return [];
        };

        const messageVars = extractVariables(message);
        const subjectVars = extractVariables(subject);

        // Combine and get unique variables
        setSelectedVariables(Array.from(new Set([...messageVars, ...subjectVars])));
    }, [message, subject]);

    // Handles toggling between plain text and HTML modes
    const handleToggleHtml = useCallback((isHtml) => {
        setIsHtmlEmail(isHtml);
        if (!isHtml) { // Switching to Plain Text mode
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = message;
            setMessage(tempDiv.innerText); // Convert HTML to plain text for textarea
        }
    }, [message]);

    const handleCsvUpload = useCallback(async (e) => {
        const file = e.target.files[0];
        e.target.value = null; // Clear input to allow re-uploading the same file

        setError("");
        setStatus("");
        setIsLoading(true);

        if (!file) {
            setCsvFile(null);
            setCsvData(null);
            setCsvColumns([]);
            setTotalRows(0);
            setShowPreview(false);
            setIsLoading(false);
            return;
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            setError("Please upload a CSV file (e.g., contacts.csv).");
            setCsvFile(null);
            setCsvData(null);
            setCsvColumns([]);
            setTotalRows(0);
            setShowPreview(false);
            setIsLoading(false);
            return;
        }

        setCsvFile(file);
        setStatus("Processing CSV file...");
        setShowPreview(false);

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
            setStatus(`CSV processed successfully! ${result.total_rows} contacts found.`);

            // Auto-select 'email' variable if available in columns
            if (result.columns.some(col => col.toLowerCase() === 'email')) {
                const emailCol = result.columns.find(col => col.toLowerCase() === 'email');
                setSelectedVariables(prev => (prev.includes(emailCol) ? prev : [...prev, emailCol]));
            }
        } catch (err) {
            setError("Error processing CSV: " + err.message);
            setCsvFile(null);
            setCsvData(null);
            setCsvColumns([]);
            setShowPreview(false);
            setStatus("");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleMediaUpload = useCallback((e) => {
        const file = e.target.files[0];
        setMediaFile(file || null);
        e.target.value = null;
    }, []);

    // This function is for inserting variables into the plain text `textarea`
    const insertVariableIntoMessage = useCallback((variable) => {
        const newVar = `{${variable}}`;
        const textarea = document.getElementById('email-message-textarea');
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newText = message.substring(0, start) + newVar + message.substring(end);
            setMessage(newText);
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + newVar.length;
                textarea.focus();
            }, 0);
        } else {
            setMessage(prev => prev + newVar);
        }
    }, [message, setMessage]);

    // This function is for inserting variables into the Subject input field
    const insertVariableIntoSubject = useCallback((variable) => {
        const newVar = `{${variable}}`;
        const input = document.getElementById('email-subject');
        if (input) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const newText = subject.substring(0, start) + newVar + subject.substring(end);
            setSubject(newText);
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

        if (!csvFile) {
            setError("Please upload your Contact List (CSV) first.");
            setIsLoading(false);
            return;
        }
        if (!subject.trim()) {
            setError("Email subject cannot be empty.");
            setIsLoading(false);
            return;
        }
        if (!message.trim()) {
            setError("Email body cannot be empty.");
            setIsLoading(false);
            return;
        }
        if (!csvColumns.some(col => col.toLowerCase() === 'email')) {
            setError("Your CSV file must contain an 'email' column for sending emails.");
            setIsLoading(false);
            return;
        }
        if ((message.includes('{') || subject.includes('{')) && selectedVariables.some(v => !csvColumns.includes(v))) {
            setError("You have variables in your email content/subject that do not match CSV columns. Please check.");
            setIsLoading(false);
            return;
        }
        if (!senderEmail || !senderPassword || !smtpServer || !smtpPort) {
            setError("Please fill in all sender email configuration details.");
            setIsLoading(false);
            return;
        }

        const actualHtmlContent = isHtmlEmail || /<[a-z][\s\S]*>/i.test(message);

        const formData = new FormData();
        formData.append("subject", subject);
        formData.append("message", message);
        formData.append("csv_file", csvFile);
        formData.append("variables", JSON.stringify(selectedVariables));
        formData.append("sender_email", senderEmail);
        formData.append("sender_password", senderPassword);
        formData.append("smtp_server", smtpServer);
        formData.append("smtp_port", smtpPort);
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
            setSuccessfulSends(result.successful_sends);
            setFailedSends(result.failed_sends);
            setLastCampaignResult({
                successful: result.successful_sends,
                failed: result.failed_sends,
                total: result.successful_sends + result.failed_sends,
                timestamp: new Date().toLocaleString()
            });

        } catch (err) {
            setError("❌ Failed to send campaign: " + err.message);
            setStatus("");
            setSuccessfulSends(0);
            setFailedSends(0);
        } finally {
            setIsLoading(false);
        }
    };

    const canProceedToNextStep = () => {
        switch (currentStep) {
            case 1:
                return csvFile && csvData && csvColumns.some(col => col.toLowerCase() === 'email');
            case 2:
                return senderEmail && senderPassword && smtpServer && smtpPort;
            case 3:
                return subject.trim() && message.trim();
            default:
                return false;
        }
    };

    const nextStep = () => {
        if (currentStep < 3 && canProceedToNextStep()) {
            setCurrentStep(currentStep + 1);
            setError(""); // Clear errors when moving to next step
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            setError(""); // Clear errors when moving to previous step
        }
    };

    const goToStep = (stepNumber) => {
        setCurrentStep(stepNumber);
        setError(""); // Clear errors when jumping to a step
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Upload Your Contacts</h2>
                            <p className="text-gray-600 dark:text-gray-400">Import your contact list and optional media files</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <FileUpload
                                    title="Contact List (CSV)"
                                    description="Upload your contacts. Must contain an 'email' column."
                                    icon={FileText}
                                    file={csvFile}
                                    acceptedTypes=".csv"
                                    onFileUpload={handleCsvUpload}
                                />

                                <FileUpload
                                    title="Media Attachment (Optional)"
                                    description="Attach an image, video, or document."
                                    icon={Image}
                                    file={mediaFile}
                                    acceptedTypes="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                                    onFileUpload={handleMediaUpload}
                                />

                                <div className="bg-blue-50/70 backdrop-blur-sm border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 rounded-xl p-6">
                                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                                        <Info className="mr-2" size={18} /> Requirements
                                    </h4>
                                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-disc pl-5">
                                        <li>CSV file must contain an 'email' column</li>
                                        <li>Supported formats: .csv files only</li>
                                        <li>Media files: images, videos, PDFs, or documents</li>
                                        <li>Preview your contacts before proceeding</li>
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
                            senderEmail={senderEmail}
                            onSenderEmailChange={setSenderEmail}
                            senderPassword={senderPassword}
                            onSenderPasswordChange={setSenderPassword}
                            smtpServer={smtpServer}
                            onSmtpServerChange={setSmtpServer}
                            smtpPort={smtpPort}
                            onSmtpPortChange={setSmtpPort}
                        />
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
                                onMessageChange={setMessage}
                                isHtmlEmail={isHtmlEmail}
                                onToggleHtml={handleToggleHtml}
                                columns={csvColumns}
                                onInsertVariable={insertVariableIntoMessage}
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
                                    <p className="text-gray-600 dark:text-gray-400">Contacts:</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{csvData?.length || 0} recipients</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">Subject:</p>
                                    <p className="font-medium text-gray-900 dark:text-white truncate">{subject || "No subject"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">Sender:</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{senderEmail || "Not configured"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 dark:text-gray-400">Variables:</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{selectedVariables.length} variables used</p>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <StatsCard icon={Users} label="Contacts" value={csvData?.length || 0} color="bg-blue-600" />
                            <StatsCard icon={MessageSquare} label="Variables" value={selectedVariables.length} color="bg-indigo-600" />
                            <StatsCard icon={Mail} label="Successful" value={successfulSends} color="bg-green-600" />
                            <StatsCard icon={X} label="Failed" value={failedSends} color="bg-red-600" />
                        </div>

                        {/* Last Campaign Results */}
                        {lastCampaignResult && (
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6 mb-6">
                                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-4 flex items-center">
                                    <CheckCircle className="mr-2" size={18} /> Last Campaign Results
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{lastCampaignResult.successful}</div>
                                        <div className="text-gray-600 dark:text-gray-400">Successful</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{lastCampaignResult.failed}</div>
                                        <div className="text-gray-600 dark:text-gray-400">Failed</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{lastCampaignResult.total}</div>
                                        <div className="text-gray-600 dark:text-gray-400">Total</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{lastCampaignResult.timestamp}</div>
                                        <div className="text-gray-600 dark:text-gray-400">Completed</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Send Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !csvFile || !subject.trim() || !message.trim() ||
                                (selectedVariables.length > 0 && !selectedVariables.every(v => csvColumns.includes(v))) ||
                                !senderEmail || !senderPassword || !smtpServer || !smtpPort}
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
        <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-blue-50 dark:from-[#111827] dark:via-black dark:to-[#10151b] text-gray-900 dark:text-white transition-colors duration-500">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <Header />
                <UpdateStatus />

                {/* Step Progress Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-center mb-4">
                        {steps.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <button
                                    onClick={() => goToStep(step.id)}
                                    className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${currentStep === step.id
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : currentStep > step.id
                                                ? 'bg-green-600 border-green-600 text-white'
                                                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                                        }`}
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

                {/* Status Messages */}
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

                {/* Main Content Card */}
                <div className="bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border-gray-800 rounded-2xl shadow-xl lg:p-8 md:p-4 p-2 min-h-[600px]">
                    {renderStepContent()}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center mt-8">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 1}
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
                        disabled={currentStep === 3 || !canProceedToNextStep()}
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