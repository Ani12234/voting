import React from 'react';
import Card from './Card';

const FeatureCard = ({ icon, title, children }) => {
  return (
    <Card className="text-center transform hover:scale-105 transition-all duration-300">
      <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
      <p className="text-gray-600">{children}</p>
    </Card>
  );
};

export default FeatureCard;
