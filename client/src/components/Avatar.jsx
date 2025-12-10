import React from 'react';
import { User } from 'lucide-react';

const Avatar = ({ user, size = "w-8 h-8", fontSize = "text-xs" }) => {
    // Determines pixel size for strict inline styling based on Tailwind class
    const pxSize = size.includes("w-4") ? "16px" : "32px";
    const style = { width: pxSize, height: pxSize, minWidth: pxSize, minHeight: pxSize, objectFit: 'cover' };
    const containerStyle = { width: pxSize, height: pxSize, minWidth: pxSize, minHeight: pxSize };

    if (user?.avatar) {
        return user.avatar.match(/^http|\/uploads/) ? 
          <img 
              src={user.avatar} 
              alt={user.name} 
              className={`${size} rounded-full object-cover border border-[var(--border-color)] block`} 
              style={style} 
          /> :
          <div className={`${size} bg-[var(--bg-input)] rounded-full flex items-center justify-center ${fontSize} border border-[var(--border-color)] shrink-0 text-[var(--text-main)]`} style={containerStyle}>{user.avatar}</div>;
    }
    // Default fallback if no avatar is set - show User icon
    return (
      <div className={`${size} bg-[var(--bg-input)] rounded-full flex items-center justify-center border border-[var(--border-color)] text-[var(--text-muted)] shrink-0`} style={containerStyle}>
          <User size={size.includes("w-4") ? 10 : 16} />
      </div>
    );
};

export default Avatar;
