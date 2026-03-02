import React from 'react';

interface EmptyStateIllustrationProps {
  title: string;
  message: string;
}

export const EmptyStateIllustration: React.FC<EmptyStateIllustrationProps> = ({ title, message }) => (
  <div className="empty-state">
    <div className="empty-illustration">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="50" fill="#f0f0f0" stroke="#d9d9d9" strokeWidth="2"/>
        <path d="M40 50L60 30L80 50" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M60 30V70" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
        <rect x="35" y="75" width="50" height="8" rx="2" fill="#999"/>
        <rect x="35" y="88" width="40" height="8" rx="2" fill="#999"/>
      </svg>
    </div>
    <div className="empty-title">{title}</div>
    <div className="empty-message">{message}</div>
  </div>
);
