import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Bold, Palette, Type, MessageSquare, Italic, Underline } from 'lucide-react';
import VariableButtons from './VariableButtons';

const EmailContentEditor = ({
    subject,
    onSubjectChange,
    message,
    onMessageChange,
    isHtmlEmail,
    onToggleHtml,
    columns,
    onInsertVariable,
    selectedVariables,
    onToggleBcc,
    isBccMode,
}) => {
    const plainTextareaRef = useRef(null); // Ref for the textarea
    const [activeColor, setActiveColor] = useState('#000000'); // Default color

    // Function to apply formatting to the textarea content
    const applyPlainTextFormatting = useCallback((tagOpen, tagClose = '') => {
        const textarea = plainTextareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = message.substring(start, end);

        let newText;
        if (selectedText) {
            newText = message.substring(0, start) + tagOpen + selectedText + tagClose + message.substring(end);
        } else {
            // If no text is selected, insert tags and place cursor in between
            newText = message.substring(0, start) + tagOpen + tagClose + message.substring(end);
        }

        onMessageChange(newText);

        // Restore cursor position
        setTimeout(() => {
            if (textarea) { // Check if textarea still exists
                if (selectedText) {
                    textarea.selectionStart = start + tagOpen.length;
                    textarea.selectionEnd = end + tagOpen.length;
                } else {
                    textarea.selectionStart = textarea.selectionEnd = start + tagOpen.length;
                }
                textarea.focus();
            }
        }, 0);
    }, [message, onMessageChange]);

    // This function handles inserting variables into the plain textarea
    const handleInsertVariable = useCallback((variable) => {
        const newVar = `{${variable}}`;
        const textarea = plainTextareaRef.current; // Always target the textarea for plain text mode

        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newText = message.substring(0, start) + newVar + message.substring(end);
            onMessageChange(newText);
            // After setting state, we need to defer cursor position update
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + newVar.length;
                textarea.focus();
            }, 0);
        }
    }, [message, onMessageChange]);


    return (
        <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border dark:border-gray-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <MessageSquare className="mr-3 text-blue-600 dark:text-blue-400" size={24} />
                    Email Content
                </h3>

                {/* Subject */}
                <div className="mb-4">
                    <label htmlFor="email-subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Subject
                    </label>
                    <input
                        id="email-subject"
                        type="text"
                        placeholder="Your email subject here. Use {Variable} for personalization."
                        value={subject}
                        onChange={(e) => onSubjectChange(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/70 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-sm text-gray-900 dark:text-white shadow-inner text-base"
                    />
                </div>

                {/* Email Type Toggle */}
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="radio"
                                className="form-radio text-blue-600 dark:text-blue-400 h-4 w-4"
                                name="emailType"
                                value="plain"
                                checked={!isHtmlEmail}
                                onChange={() => onToggleHtml(false)}
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Plain Text</span>
                        </label>
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="radio"
                                className="form-radio text-blue-600 dark:text-blue-400 h-4 w-4"
                                name="emailType"
                                value="html"
                                checked={isHtmlEmail}
                                onChange={() => onToggleHtml(true)}
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">HTML Email</span>
                        </label>
                    </div>

                    {/* BCC Toggle */}
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="form-checkbox text-blue-600 dark:text-blue-400 h-4 w-4 rounded"
                            checked={isBccMode}
                            onChange={() => onToggleBcc(!isBccMode)}
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Send as BCC</span>
                    </label>
                </div>


                {/* Formatting Controls (ONLY for Plain Text mode as per your request) */}
                {!isHtmlEmail && (
                    <div className="flex flex-wrap gap-2 mb-4 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                        <button
                            type="button"
                            onClick={() => applyPlainTextFormatting('<b>', '</b>')}
                            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                            title="Bold"
                        >
                            <Bold size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => applyPlainTextFormatting('<i>', '</i>')}
                            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                            title="Italic"
                        >
                            <Italic size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => applyPlainTextFormatting('<u>', '</u>')}
                            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                            title="Underline"
                        >
                            <Underline size={18} />
                        </button>
                        {/* Note: Color and Font Size are harder to implement for pure plain text.
                             For these to work, the message would implicitly become HTML,
                             even if the input method is a textarea.
                             If you need true plain text with these, you'd insert specific codes
                             like [color=red]text[/color], which would require a custom parser
                             on the backend before sending.
                             For simplicity, I'm providing an example that inserts <span> tags. */}
                        <label className="relative p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer" title="Font Color">
                            <Palette size={18} />
                            <input
                                type="color"
                                value={activeColor}
                                onChange={(e) => {
                                    const color = e.target.value;
                                    setActiveColor(color);
                                    applyPlainTextFormatting(`<span style="color:${color}">`, '</span>');
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </label>
                        <select
                            onChange={(e) => {
                                const size = e.target.value;
                                applyPlainTextFormatting(`<span style="font-size:${size}px">`, '</span>');
                            }}
                            className="p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm"
                            title="Font Size"
                            defaultValue=""
                        >
                            <option value="">Size</option>
                            <option value="12">Small</option>
                            <option value="16">Normal</option>
                            <option value="20">Medium</option>
                            <option value="24">Large</option>
                        </select>
                        {/* You can add more formatting options here (e.g., lists, links, etc.) */}
                    </div>
                )}

                {/* Message Input Area (Conditional Render) */}
                {isHtmlEmail ? (
                    // When HTML Email is selected, allow raw HTML input
                    <textarea
                        id="email-message-html" // Changed ID for clarity
                        placeholder="Paste your full HTML code here for the email content."
                        onChange={(e) => onMessageChange(e.target.value)}
                        value={message} // This textarea will show raw HTML
                        rows={10}
                        className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/70 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-sm text-gray-900 dark:text-white resize-y shadow-inner text-base font-mono" // Added font-mono for code-like appearance
                    />
                ) : (
                    // When Plain Text is selected, show the textarea with formatting buttons
                    <textarea
                        id="email-message-textarea"
                        ref={plainTextareaRef}
                        placeholder="Type your plain text email content here. Use the formatting options above. Add {Variable} for personalization."
                        onChange={(e) => onMessageChange(e.target.value)}
                        value={message}
                        rows={10}
                        className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/70 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-sm text-gray-900 dark:text-white resize-y shadow-inner text-base"
                    />
                )}


                {columns.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Insert Variables</h4>
                        <VariableButtons columns={columns} onInsertVariable={handleInsertVariable} />
                    </div>
                )}

                {selectedVariables.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">Variables in use:</span>
                        {selectedVariables.map((variable, idx) => (
                            <span key={idx} className="inline-block px-2.5 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                                {variable}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmailContentEditor;