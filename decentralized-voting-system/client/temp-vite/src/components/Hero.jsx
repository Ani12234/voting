import React from 'react';
import { motion } from 'framer-motion';

const Hero = ({ actions }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center py-20"
    >
      <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-4 leading-tight">
        The Future of Voting is <span className="text-blue-600">Decentralized</span>
      </h1>
      <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto">
        Experience a new era of secure, transparent, and immutable voting powered by blockchain technology.
      </p>
      <div className="flex flex-wrap justify-center items-center gap-4">
        {actions}
      </div>
    </motion.div>
  );
};

export default Hero;
