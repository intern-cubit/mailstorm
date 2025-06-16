import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Header = () => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <header className="flex justify-between items-center py-4 px-6 bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border dark:border-gray-800 shadow-sm rounded-xl mb-8">
            <div className="flex items-center">
                <h1 className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 mr-2">
                    Wa
                </h1>
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                    Bomb
                </span>
                <p className="hidden md:block ml-4 text-gray-600 dark:text-gray-400 text-sm">
                    Seamlessly manage your Email campaigns.
                </p>
            </div>
            <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-300 shadow-md"
                aria-label="Toggle theme"
            >
                {isDark ? <Sun className="text-yellow-400" size={20} /> : <Moon className="text-blue-800" size={20} />}
            </button>
        </header>
    );
};

export default Header;