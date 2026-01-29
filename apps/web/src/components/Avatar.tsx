/**
 * Avatar Component
 * Displays user profile picture with fallback to initials
 * Supports various sizes and IDP-sourced images
 */

import { useState } from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  name?: string;
  firstName?: string;
  lastName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBadge?: boolean;
  badgeContent?: React.ReactNode;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-20 h-20 text-2xl',
  '2xl': 'w-24 h-24 text-3xl',
};

const badgeSizes = {
  xs: 'w-2 h-2 -right-0.5 -bottom-0.5',
  sm: 'w-2.5 h-2.5 -right-0.5 -bottom-0.5',
  md: 'w-3 h-3 -right-0.5 -bottom-0.5',
  lg: 'w-3.5 h-3.5 -right-1 -bottom-1',
  xl: 'w-4 h-4 -right-1 -bottom-1',
  '2xl': 'w-5 h-5 -right-1 -bottom-1',
};

export default function Avatar({
  src,
  name,
  firstName,
  lastName,
  size = 'md',
  className = '',
  showBadge = false,
  badgeContent,
  onClick,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Generate initials
  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return '';
  };

  const initials = getInitials();
  const showImage = src && !imageError;

  // Generate a consistent color based on the name
  const getBackgroundColor = () => {
    if (!initials) return 'rgb(var(--color-bg-muted))';
    
    // Use a hash of the name to generate a consistent color using CSS variables
    const colors = [
      'rgb(var(--color-text))', // Primary dark
      'rgb(var(--color-gray-700))', // Gray-700
      'rgb(var(--color-gray-600))', // Gray-600
      'rgb(var(--color-gray-500))', // Gray-500
    ];
    
    const hash = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
    return colors[hash % colors.length];
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={`
        relative inline-flex items-center justify-center rounded-full 
        font-semibold overflow-hidden flex-shrink-0 transition-transform
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2' : ''}
        ${className}
      `}
      style={{ 
        backgroundColor: showImage && imageLoaded ? 'transparent' : getBackgroundColor(),
        color: 'white',
      }}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {/* Profile Image */}
      {showImage && (
        <img
          src={src}
          alt={name || 'User avatar'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer" // Important for Google profile pictures
        />
      )}

      {/* Fallback: Initials or Icon */}
      {(!showImage || !imageLoaded) && (
        <>
          {initials ? (
            <span className="select-none">{initials}</span>
          ) : (
            <User className="w-1/2 h-1/2" />
          )}
        </>
      )}

      {/* Optional Badge (e.g., online status, IDP icon) */}
      {showBadge && (
        <span 
          className={`absolute rounded-full border-2 ${badgeSizes[size]}`}
          style={{ 
            borderColor: 'rgb(var(--color-surface))',
            backgroundColor: 'rgb(var(--color-success))',
          }}
        >
          {badgeContent}
        </span>
      )}
    </Component>
  );
}

/**
 * Avatar Group - Shows multiple avatars stacked
 */
interface AvatarGroupProps {
  users: Array<{
    src?: string | null;
    name?: string;
    firstName?: string;
    lastName?: string;
  }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  const overlapClasses = {
    xs: '-ml-1.5',
    sm: '-ml-2',
    md: '-ml-2.5',
    lg: '-ml-3',
    xl: '-ml-4',
  };

  return (
    <div className="flex items-center">
      {visibleUsers.map((user, index) => (
        <div 
          key={index} 
          className={`${index > 0 ? overlapClasses[size] : ''} rounded-full`}
          style={{ 
            boxShadow: '0 0 0 2px rgb(var(--color-surface))',
          }}
        >
          <Avatar
            src={user.src}
            name={user.name}
            firstName={user.firstName}
            lastName={user.lastName}
            size={size}
          />
        </div>
      ))}
      {remainingCount > 0 && (
        <div 
          className={`
            ${overlapClasses[size]} rounded-full flex items-center justify-center
            ${sizeClasses[size]}
          `}
          style={{ 
            backgroundColor: 'rgb(var(--color-bg-muted))',
            color: 'rgb(var(--color-text-muted))',
            boxShadow: '0 0 0 2px rgb(var(--color-surface))',
          }}
        >
          <span className="text-xs font-medium">+{remainingCount}</span>
        </div>
      )}
    </div>
  );
}

/**
 * IDP Badge - Shows which identity provider the user logged in with
 */
interface IDPBadgeProps {
  provider?: string;
  size?: 'sm' | 'md';
}

export function IDPBadge({ provider, size = 'sm' }: IDPBadgeProps) {
  if (!provider || provider === 'local') return null;

  const icons: Record<string, { icon: string; bg: string }> = {
    google: { icon: 'G', bg: '#4285f4' },
    microsoft: { icon: 'M', bg: '#00a4ef' },
    github: { icon: 'GH', bg: '#24292e' },
    linkedin: { icon: 'in', bg: '#0077b5' },
    saml: { icon: 'SSO', bg: '#6b7280' },
    oidc: { icon: 'ID', bg: '#6b7280' },
  };

  const idpInfo = icons[provider.toLowerCase()] || { icon: provider[0].toUpperCase(), bg: '#6b7280' };
  const sizeClass = size === 'sm' ? 'w-4 h-4 text-[8px]' : 'w-5 h-5 text-[10px]';

  return (
    <span 
      className={`inline-flex items-center justify-center rounded-full text-white font-bold ${sizeClass}`}
      style={{ backgroundColor: idpInfo.bg }}
      title={`Logged in with ${provider}`}
    >
      {idpInfo.icon}
    </span>
  );
}
