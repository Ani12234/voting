import React from 'react';

const Card = ({ children, className, ...props }) => {
  return (
    <div
      className={`bg-white rounded-2xl shadow-lg p-8 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
