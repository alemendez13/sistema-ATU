"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SubNavbarGestion() {
    const pathname = usePathname();

    const tabs = [
        { name: '📖 Manuales y Procesos', href: '/configuracion/conocimiento' },
        { name: '🛡️ Auditoría de Integridad', href: '/configuracion/auditoria' },
        { name: '📊 Dashboard OKRs', href: '/configuracion/okrs' },
    ];

    return (
        <nav className="flex space-x-4 border-b border-gray-200 mb-6">
            {tabs.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                    <Link
                        key={tab.name}
                        href={tab.href}
                        className={`py-2 px-4 text-sm font-medium transition-colors border-b-2 ${
                            isActive 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-gray-500 hover:text-blue-500 hover:border-gray-300'
                        }`}
                    >
                        {tab.name}
                    </Link>
                );
            })}
        </nav>
    );
}