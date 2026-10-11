import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import Navbar from './Navbar';
import { ImpersonationBanner } from './ImpersonationBanner';

const Layout = ({ children }: any) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
            <ImpersonationBanner />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

                <div className="flex-1 flex flex-col overflow-hidden">
                    <Navbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

                    <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-gray-50">
                        <div className="container mx-auto">
                            {children}
                        </div>

                        <footer className="mt-auto py-4 text-center text-gray-400 text-xs">
                            Powered by <span className="font-bold text-primary opacity-70 italic tracking-wider">LARIA</span>
                        </footer>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Layout;
