import React, { useState, useEffect } from 'react';
import { FurnitureSpecs, Product } from '../types';
import { Button, Input } from './UI';
import { Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ServiceConfigFormProps {
    item: Product & { cartQty?: number };
    initialSpecs?: string;
    onConfirm: (type: 'INTERNAL' | 'OUTSOURCED', specs: string) => void;
}

export const ServiceConfigForm: React.FC<ServiceConfigFormProps> = ({ item, initialSpecs, onConfirm }) => {
    const [type, setType] = useState<'INTERNAL' | 'OUTSOURCED'>('INTERNAL');
    const [specs, setSpecs] = useState(''); // For outsourced text
    const [osData, setOsData] = useState<FurnitureSpecs>({
        model: '',
        foam: [],
        arm: { types: [], berola: { has: false } },
        modules: [],
        seatsCount: [],
        seatConfig: { types: [], ponto: false, berola: { has: false } },
        backrestConfig: { types: [], ponto: false, berola: { has: false } },
        observations: ''
    });
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (initialSpecs) {
            try {
                // Try parsing JSON first (Internal OS)
                const parsed = JSON.parse(initialSpecs);
                if (typeof parsed === 'object' && parsed !== null) {
                    setOsData(parsed);
                    setType('INTERNAL');
                } else {
                    // If simple string (Outsourced)
                    setSpecs(initialSpecs);
                    setType('OUTSOURCED');
                }
            } catch (e) {
                // Fallback for simple string
                setSpecs(initialSpecs);
                setType('OUTSOURCED');
            }
        }
    }, [initialSpecs]);

    const handleCheckboxChange = (field: keyof FurnitureSpecs, value: string) => {
        setOsData(prev => {
            const list = (prev[field] as string[]) || [];
            if (list.includes(value)) {
                return { ...prev, [field]: list.filter(i => i !== value) };
            }
            return { ...prev, [field]: [...list, value] };
        });
    };

    const handleDeepCheckbox = (section: 'arm' | 'seatConfig' | 'backrestConfig', field: 'types', value: string) => {
        setOsData(prev => {
            const sec = prev[section] as any;
            const list = sec.types || [];
            if (list.includes(value)) {
                return { ...prev, [section]: { ...sec, types: list.filter((i: string) => i !== value) } };
            }
            return { ...prev, [section]: { ...sec, types: [...list, value] } };
        });
    };

    const handleBerola = (section: 'arm' | 'seatConfig' | 'backrestConfig', has: boolean, size?: string) => {
        setOsData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                berola: {
                    has,
                    size: size !== undefined ? size : (prev[section] as any)?.berola?.size
                }
            }
        }));
    };

    const handlePonto = (section: 'seatConfig' | 'backrestConfig', val: boolean) => {
        setOsData(prev => ({
            ...prev,
            [section]: { ...(prev[section] as any), ponto: val }
        }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `os-ref-${Math.random().toString(36).substring(2)}.${fileExt}`;

        setIsUploading(true);
        try {
            const { error: uploadError } = await supabase.storage
                .from('products')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('products').getPublicUrl(fileName);
            setOsData(prev => ({ ...prev, visualReference: data.publicUrl }));

        } catch (error) {
            console.error('Upload failed, falling back to Base64', error);
            const reader = new FileReader();
            reader.onload = (ev) => {
                setOsData(prev => ({ ...prev, visualReference: ev.target?.result as string }));
            };
            reader.readAsDataURL(file);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = () => {
        if (type === 'INTERNAL') {
            onConfirm(type, JSON.stringify(osData));
        } else {
            onConfirm(type, specs);
        }
    };

    return (
        <div className="space-y-4 max-h-[80vh] overflow-y-auto p-1 custom-scrollbar">
            <div className="p-3 bg-wine-50 dark:bg-slate-700/50 rounded border border-wine-100 dark:border-slate-600">
                <h4 className="font-bold text-wine-900 dark:text-white">{item.name}</h4>
                <p className="text-xs text-wine-500 dark:text-slate-300">Defina os detalhes da Ordem de Serviço:</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setType('INTERNAL')}
                    className={`p-3 rounded-lg border-2 text-center text-sm transition-all ${type === 'INTERNAL' ? 'border-wine-900 bg-wine-100 text-wine-900 font-bold dark:bg-wine-800 dark:text-white dark:border-wine-500' : 'border-wine-100 text-wine-400 dark:border-slate-600'}`}
                >
                    Produção Interna (OS)
                </button>
                <button
                    onClick={() => setType('OUTSOURCED')}
                    className={`p-3 rounded-lg border-2 text-center text-sm transition-all ${type === 'OUTSOURCED' ? 'border-wine-900 bg-wine-100 text-wine-900 font-bold dark:bg-wine-800 dark:text-white dark:border-wine-500' : 'border-wine-100 text-wine-400 dark:border-slate-600'}`}
                >
                    Terceirizado
                </button>
            </div>

            {type === 'INTERNAL' ? (
                <div className="space-y-6 animate-fade-in text-wine-900 dark:text-white">
                    <Input
                        label="Modelo do Estofado"
                        value={osData.model || ''}
                        onChange={e => setOsData({ ...osData, model: e.target.value })}
                        placeholder="Ex: Sofá Retrátil 3 Lugares"
                    />

                    {/* --- ESPUMA --- */}
                    <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-slate-700 px-3 py-1 border-b border-gray-200 dark:border-slate-600 font-bold text-xs uppercase">Espuma</div>
                        <div className="p-3 grid grid-cols-2 gap-2">
                            {['Soft', 'Selada'].map(opt => (
                                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={osData.foam?.includes(opt)}
                                        onChange={() => handleCheckboxChange('foam', opt)}
                                        className="rounded text-wine-900 focus:ring-wine-500"
                                    />
                                    {opt}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* --- BRAÇO --- */}
                    <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-slate-700 px-3 py-1 border-b border-gray-200 dark:border-slate-600 font-bold text-xs uppercase">Braço</div>
                        <div className="p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                {['10cm', '15cm', '20cm', 'Reto', 'Pastel'].map(opt => (
                                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={osData.arm?.types?.includes(opt)}
                                            onChange={() => handleDeepCheckbox('arm', 'types', opt)}
                                            className="rounded text-wine-900 focus:ring-wine-500"
                                        />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700">
                                <span className="text-xs font-bold uppercase w-16">Berola</span>
                                <label className="flex items-center gap-1 text-xs"><input type="radio" checked={osData.arm?.berola?.has === true} onChange={() => handleBerola('arm', true)} /> Sim</label>
                                <label className="flex items-center gap-1 text-xs"><input type="radio" checked={osData.arm?.berola?.has === false} onChange={() => handleBerola('arm', false)} /> Não</label>
                                {osData.arm?.berola?.has && (
                                    <div className="flex items-center gap-1 ml-2">
                                        <span className="text-xs">cm:</span>
                                        <input
                                            className="w-12 h-6 border rounded px-1 text-xs"
                                            value={osData.arm?.berola?.size || ''}
                                            onChange={e => handleBerola('arm', true, e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- MÓDULOS & ASSENTOS (COUNT) --- */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 dark:bg-slate-700 px-3 py-1 border-b border-gray-200 dark:border-slate-600 font-bold text-xs uppercase">Módulos</div>
                            <div className="p-3 flex gap-4">
                                {['1', '2', '3'].map(n => (
                                    <label key={n} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={osData.modules?.includes(n)} onChange={() => handleCheckboxChange('modules', n)} /> {n}</label>
                                ))}
                            </div>
                        </div>
                        <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 dark:bg-slate-700 px-3 py-1 border-b border-gray-200 dark:border-slate-600 font-bold text-xs uppercase">Assentos</div>
                            <div className="p-3 flex gap-4">
                                {['1', '2', '3'].map(n => (
                                    <label key={`seat-count-${n}`} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={osData.seatsCount?.includes(n)} onChange={() => handleCheckboxChange('seatsCount', n)} /> {n}</label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- ASSENTO DETAILS --- */}
                    <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-slate-700 px-3 py-1 border-b border-gray-200 dark:border-slate-600 font-bold text-xs uppercase">Detalhes do Assento</div>
                        <div className="p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                {['Plw. Quadrado', 'Plw. Pastel', 'Barcelona', 'Quadrado'].map(opt => (
                                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={osData.seatConfig?.types?.includes(opt)}
                                            onChange={() => handleDeepCheckbox('seatConfig', 'types', opt)}
                                            className="rounded text-wine-900 focus:ring-wine-500"
                                        />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700">
                                    <span className="text-xs font-bold uppercase">Ponto</span>
                                    <label className="flex items-center gap-1 text-xs"><input type="radio" checked={osData.seatConfig?.ponto === true} onChange={() => handlePonto('seatConfig', true)} /> Sim</label>
                                    <label className="flex items-center gap-1 text-xs"><input type="radio" checked={osData.seatConfig?.ponto === false} onChange={() => handlePonto('seatConfig', false)} /> Não</label>
                                </div>
                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700">
                                    <span className="text-xs font-bold uppercase">Berola</span>
                                    <div className="flex flex-col">
                                        <div className="flex gap-2">
                                            <label className="flex items-center gap-1 text-xs"><input type="radio" checked={osData.seatConfig?.berola?.has === true} onChange={() => handleBerola('seatConfig', true)} /> Sim</label>
                                            <label className="flex items-center gap-1 text-xs"><input type="radio" checked={osData.seatConfig?.berola?.has === false} onChange={() => handleBerola('seatConfig', false)} /> Não</label>
                                        </div>
                                        {osData.seatConfig?.berola?.has && (
                                            <input
                                                className="w-full h-6 border rounded px-1 text-xs mt-1"
                                                placeholder="cm"
                                                value={osData.seatConfig?.berola?.size || ''}
                                                onChange={e => handleBerola('seatConfig', true, e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- ENCOSTO DETAILS --- */}
                    <div className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-slate-700 px-3 py-1 border-b border-gray-200 dark:border-slate-600 font-bold text-xs uppercase">Detalhes do Encosto</div>
                        <div className="p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                {['Bipartido', 'Pastel', 'Fixo', 'Solta'].map(opt => (
                                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={osData.backrestConfig?.types?.includes(opt)}
                                            onChange={() => handleDeepCheckbox('backrestConfig', 'types', opt)}
                                            className="rounded text-wine-900 focus:ring-wine-500"
                                        />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700">
                                    <span className="text-xs font-bold uppercase">Ponto</span>
                                    <label className="flex items-center gap-1 text-xs"><input type="radio" checked={osData.backrestConfig?.ponto === true} onChange={() => handlePonto('backrestConfig', true)} /> Sim</label>
                                    <label className="flex items-center gap-1 text-xs"><input type="radio" checked={osData.backrestConfig?.ponto === false} onChange={() => handlePonto('backrestConfig', false)} /> Não</label>
                                </div>
                                <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700">
                                    <span className="text-xs font-bold uppercase">Berola</span>
                                    <div className="flex flex-col">
                                        <div className="flex gap-2">
                                            <label className="flex items-center gap-1 text-xs"><input type="radio" checked={osData.backrestConfig?.berola?.has === true} onChange={() => handleBerola('backrestConfig', true)} /> Sim</label>
                                            <label className="flex items-center gap-1 text-xs"><input type="radio" checked={osData.backrestConfig?.berola?.has === false} onChange={() => handleBerola('backrestConfig', false)} /> Não</label>
                                        </div>
                                        {osData.backrestConfig?.berola?.has && (
                                            <input
                                                className="w-full h-6 border rounded px-1 text-xs mt-1"
                                                placeholder="cm"
                                                value={osData.backrestConfig?.berola?.size || ''}
                                                onChange={e => handleBerola('backrestConfig', true, e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- VISUAL REFERENCE --- */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase">Referência Visual</label>
                        <div className="flex items-center gap-4">
                            {osData.visualReference && (
                                <div className="relative w-24 h-24 rounded border overflow-hidden group">
                                    <img src={osData.visualReference} alt="Ref" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setOsData(prev => ({ ...prev, visualReference: '' }))}
                                        className="absolute top-0 right-0 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}
                            <label className="flex flex-col items-center justify-center w-32 h-24 border-2 border-wine-200 border-dashed rounded cursor-pointer hover:bg-wine-50 transition-colors">
                                {isUploading ? (
                                    <Loader2 className="animate-spin text-wine-500" />
                                ) : (
                                    <>
                                        <Upload className="text-wine-400 mb-1" size={20} />
                                        <span className="text-[10px] text-wine-500 font-bold">Enviar Foto</span>
                                    </>
                                )}
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                            </label>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase">Observações do Serviço</label>
                        <textarea
                            className="w-full p-2 text-sm border rounded-lg h-20 bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                            placeholder="Outros detalhes..."
                            value={osData.observations || ''}
                            onChange={e => setOsData({ ...osData, observations: e.target.value })}
                        />
                    </div>

                </div>
            ) : (
                <div className="space-y-2 animate-fade-in">
                    <label className="text-xs font-semibold text-wine-600 dark:text-wine-300 uppercase tracking-wider">Observações (Opcional)</label>
                    <textarea
                        className="w-full h-32 p-3 border border-wine-200 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-wine-500 text-black dark:text-white bg-white dark:bg-slate-700 placeholder-wine-300"
                        placeholder="Observações sobre a terceirização..."
                        value={specs}
                        onChange={e => setSpecs(e.target.value)}
                    />
                </div>
            )}

            <Button onClick={handleSubmit} className="w-full mt-4 h-12 text-lg">Confirmar Configuração</Button>
        </div>
    );
};
