import React from 'react';

interface NavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    children: React.ReactNode;
    className?: string;
}

/**
 * Composant de lien universel :
 * Fonctionne immédiatement avec du HTML natif <a> ou peut être substitué par
 * Next.js Link / React Router Link selon le framework du projet.
 */
export const NavLink: React.FC<NavLinkProps> = ({ href, children, className, ...props }) => {
    return (
        <a href={href} className={className} {...props}>
            {children}
        </a>
    );
};

export default NavLink;
