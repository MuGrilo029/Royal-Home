
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Card, Button, Input, Table, Modal, formatCpfCnpj, formatPhone } from '../components/UI';
import { Plus, Trash2, Search, Phone, MapPin, Building2, Tag, Edit } from 'lucide-react';
import { Supplier } from '../types';
import { getUUID } from '../lib/utils';

export const Suppliers: React.FC = () => {
    const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useAppStore();
    const [showForm, setShowForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [formData, setFormData] = useState<Partial<Supplier>>({});
    const [searchTerm, setSearchTerm] = useState('');

    const handleOpenModal = (supplier?: Supplier) => {
        if (supplier) {
            setFormData({ ...supplier });
        } else {
            setFormData({});
        }
        setShowForm(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        const supplierData: Supplier = {
            id: formData.id || getUUID(),
            name: formData.name!,
            companyName: formData.companyName || '',
            cpfCnpj: formData.cpfCnpj || '',
            contact: formData.contact || '',
            address: formData.address || '',
            category: formData.category || 'Geral'
        };

        if (formData.id) {
            updateSupplier(supplierData);
        } else {
            addSupplier(supplierData);
        }
        setShowForm(false);
    };

    const handleConfirmDelete = () => {
        if (formData.id) {
            deleteSupplier(formData.id);
            setShowDeleteConfirm(false);
            setShowForm(false);
        }
    };

    const filteredSuppliers = (suppliers || []).filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.cpfCnpj?.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-wine-900 dark:text-white">Gestão de Fornecedores</h2>
                <Button onClick={() => handleOpenModal()}><Plus size={18} /> Novo Fornecedor</Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-wine-300" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por nome, razão social ou CNPJ..."
                    className="w-full pl-10 pr-4 py-2 border border-wine-200 rounded-lg outline-none focus:ring-2 focus:ring-wine-500 placeholder-wine-400 text-black bg-wine-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <Modal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title={formData.id ? "Editar Fornecedor" : "Cadastrar Novo Fornecedor"}
            >
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Nome Fantasia *"
                        value={formData.name || ''}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        autoFocus
                    />
                    <Input
                        label="Razão Social"
                        value={formData.companyName || ''}
                        onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    />
                    <Input
                        label="CPF / CNPJ"
                        value={formData.cpfCnpj || ''}
                        onChange={e => setFormData({ ...formData, cpfCnpj: formatCpfCnpj(e.target.value) })}
                        maxLength={18}
                        placeholder="00.000.000/0000-00"
                    />
                    <Input
                        label="Contato (Nome/Tel)"
                        value={formData.contact || ''}
                        onChange={e => setFormData({ ...formData, contact: formatPhone(e.target.value) })}
                        placeholder="Ex: (11) 99999-9999"
                    />
                    <div className="md:col-span-2">
                        <Input
                            label="Endereço Completo"
                            value={formData.address || ''}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-wine-700 dark:text-wine-200 mb-1">
                            Categoria
                        </label>
                        <input
                            list="categories"
                            className="w-full px-3 py-2 border border-wine-200 rounded-lg outline-none focus:ring-2 focus:ring-wine-500 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white transition-colors"
                            value={formData.category || ''}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            placeholder="Ex: Matéria Prima, Transporte..."
                        />
                        <datalist id="categories">
                            <option value="Matéria Prima" />
                            <option value="Transporte" />
                            <option value="Serviços" />
                            <option value="Utilidades" />
                        </datalist>
                    </div>

                    <div className="md:col-span-2 flex justify-between items-center mt-4 pt-4 border-t border-wine-100 dark:border-slate-700">
                        {formData.id && (
                            <Button type="button" variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                                <Trash2 size={18} /> Excluir
                            </Button>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                            <Button type="submit">Salvar Fornecedor</Button>
                        </div>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Confirmar Exclusão"
            >
                <div className="space-y-4">
                    <p className="text-wine-800 dark:text-wine-200">
                        Tem certeza que deseja excluir o fornecedor <strong>{formData.name}</strong>?
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                            Cancelar
                        </Button>
                        <Button type="button" variant="danger" onClick={handleConfirmDelete}>
                            Confirmar Exclusão
                        </Button>
                    </div>
                </div>
            </Modal>

            <Card>
                <Table headers={['Nome / Razão', 'CNPJ/CPF', 'Contato', 'Categoria', 'Ações']}>
                    {filteredSuppliers.map(s => (
                        <tr
                            key={s.id}
                            className="hover:bg-wine-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            onClick={() => handleOpenModal(s)}
                        >
                            <td className="py-3 px-4">
                                <div className="flex flex-col">
                                    <span className="font-medium text-wine-900 dark:text-wine-100">{s.name}</span>
                                    {s.companyName && <span className="text-xs text-wine-400">{s.companyName}</span>}
                                </div>
                            </td>
                            <td className="py-3 px-4 text-wine-600 dark:text-wine-300">{s.cpfCnpj || '-'}</td>
                            <td className="py-3 px-4">
                                <div className="flex flex-col text-sm text-wine-600 dark:text-wine-300">
                                    <span className="flex items-center gap-1"><Phone size={12} /> {s.contact}</span>
                                    {s.address && <span className="flex items-center gap-1 text-wine-400 mt-1 truncate max-w-[150px]" title={s.address}><MapPin size={12} /> {s.address}</span>}
                                </div>
                            </td>
                            <td className="py-3 px-4">
                                {s.category && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-wine-100 text-wine-800 dark:bg-slate-700 dark:text-wine-200">
                                        <Tag size={10} className="mr-1" />
                                        {s.category}
                                    </span>
                                )}
                            </td>
                            <td className="py-3 px-4">
                                <button className="text-wine-400 hover:text-wine-600 dark:hover:text-wine-200 p-1">
                                    <Edit size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filteredSuppliers.length === 0 && (
                        <tr>
                            <td colSpan={5} className="text-center py-8 text-wine-300 dark:text-slate-500">
                                Nenhum fornecedor encontrado.
                            </td>
                        </tr>
                    )}
                </Table>
            </Card>
        </div>
    );
};
