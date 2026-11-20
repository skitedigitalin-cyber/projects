import React from 'react';
import Layout from '../components/Layout';

export default function Projects() {
    return (
        <Layout>
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes fadeUp {
                        from { opacity: 0; transform: translateY(40px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-up {
                        animation: fadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                        opacity: 0;
                    }
                    .delay-100 { animation-delay: 100ms; }
                    .delay-200 { animation-delay: 200ms; }
                `
            }} />
            
            <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-up delay-100">
                <div className="mb-12">
                    <h1 className="text-4xl font-light tracking-tight text-slate-900 mb-4">Projects</h1>
                    <p className="text-lg text-slate-500 font-light">The Projects module is under development.</p>
                </div>
                
                <div className="group p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 animate-fade-up delay-200 cursor-pointer mb-8">
                    <div className="bg-slate-900 text-white rounded-[1.5rem] p-8 shadow-sm group-hover:shadow-lg transition-all relative overflow-hidden h-64 flex flex-col justify-between">
                        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-slate-800 rounded-full blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="relative z-10">
                            <h2 className="text-2xl font-semibold mb-2 group-hover:translate-x-2 transition-transform duration-300">Upcoming Features</h2>
                            <p className="text-slate-400 max-w-sm">Manage your project pipelines, tasks, and deadlines with our new floating pill strip tables.</p>
                        </div>
                        <div className="relative z-10 flex justify-end">
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:rotate-12 group-hover:scale-110 transition-all duration-300">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="group p-2 bg-slate-50/80 rounded-[2rem] border border-slate-100 animate-fade-up delay-200">
                    <div className="bg-white rounded-[1.5rem] p-6 shadow-sm group-hover:shadow-lg transition-all">
                        <div className="space-y-3">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="flex items-center justify-between p-4 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors cursor-pointer group/row">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 group-hover/row:scale-110 transition-transform flex items-center justify-center text-slate-500 font-medium">{item}</div>
                                        <div className="font-medium text-slate-700">Sample Project {item}</div>
                                    </div>
                                    <div className="text-sm text-slate-400">In Progress</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
