import React from 'react';

const StatsCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white/70 backdrop-blur-sm border border-gray-200 dark:bg-[rgba(30,30,30,0.5)] dark:backdrop-blur-md dark:border dark:border-gray-800 rounded-lg p-4 shadow-md">
    <div className="flex items-center">
      <div className={`p-2 rounded-md ${color} mr-3`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  </div>
);

export default StatsCard;