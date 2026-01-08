import React, { useState } from 'react';
import { ServiceItem, ServiceType } from '../types';
import { Package, Plus, DollarSign, Tag, Search, Trash2, X, Cog, Box, Edit3, Info, RefreshCw, Calendar } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface Props {
  catalog: ServiceItem[];
  setCatalog: React.Dispatch<React.SetStateAction<ServiceItem[]>>;
  formatMoney: (val: number, curr?: string) => string;
}

const CatalogView: React.FC<Props> = ({ catalog, setCatalog, formatMoney }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentSvc, setCurrentSvc] = useState<Partial<ServiceItem>>({
    name: '',
    description: '',
    basePrice: 0,
    unitCost: 0,
    programmingCost: 0,
    currency: 'OMR',
    type: 'One-time',
    minContractMonths: 1
  });

  const resetForm = () => {
    setCurrentSvc({ 
      name: '', description: '', basePrice: 0, 
      unitCost: 0, programmingCost: 0, currency: 'OMR',
      type: 'One-time', minContractMonths: 1
    });
    setIsEditing(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (item: ServiceItem) => {
    setCurrentSvc(item);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!currentSvc.name) return;
    const unit = currentSvc.unitCost || 0;
    const prog = currentSvc.programmingCost || 0;
    const baseCost = unit + prog;
    
    if (isEditing && currentSvc.id) {
      setCatalog(prev => prev.map(item => 
        item.id === currentSvc.id ? { ...item, ...currentSvc as ServiceItem, baseCost } : item
      ));
    } else {
      const newId = Math.random().toString(36).substr(2, 9);
      setCatalog(prev => [...prev, { 
        ...currentSvc as ServiceItem, 
        id: newId,
        baseCost,
        currency: 'OMR'
      }]);
    }
    
    setShowModal(false);
    resetForm();
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    setCatalog(catalog.filter(i => i.id !== itemToDelete));
    setItemToDelete(null);
  };

  const filteredCatalog = catalog.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search services..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary-500 transition-all bg-white dark:bg-slate-900 dark:text-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-700 shadow-lg shadow-primary-500/30 transition-all w-full md:w-auto justify-center active:scale-95"
        >
          <Plus size={20} /> Add New Service
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCatalog.map((item) => {
          const margin = Math.round(((item.basePrice - item.baseCost) / (item.basePrice || 1)) * 100);
          return (
            <div 
              key={item.id} 
              onClick={() => handleOpenEdit(item)}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-xl hover:shadow-primary-500/5 transition-all cursor-pointer group relative"
            >
              <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
                      {item.type === 'Recurring' ? <RefreshCw size={24} /> : <Package size={24} />}
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="text-right">
                          <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Net Margin</div>
                          <div className={`font-black text-sm ${margin > 50 ? 'text-emerald-600' : margin > 20 ? 'text-primary-600 dark:text-primary-400' : 'text-amber-600 dark:text-amber-500'}`}>
                            {margin}%
                          </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete(item.id);
                          setShowConfirmDelete(true);
                        }}
                        className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Delete Service"
                      >
                        <Trash2 size={18} />
                      </button>
                  </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                   <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{item.name}</h3>
                   {item.type === 'Recurring' && <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 text-[9px] font-black uppercase rounded border border-primary-100 dark:border-primary-800">Contract</span>}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 line-clamp-2 font-medium">{item.description}</p>
                {item.type === 'Recurring' && (
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-4">
                    <Calendar size={12} /> Min. Term: {item.minContractMonths} Months
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 pt-5 border-t border-slate-50 dark:border-slate-800">
                  <div className="space-y-1">
                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Sale Price</div>
                      <div className="flex items-center gap-1 text-slate-900 dark:text-slate-100 font-black text-xs">
                          {formatMoney(item.basePrice, item.currency)}
                      </div>
                  </div>
                  <div className="space-y-1">
                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Material</div>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-bold text-xs">
                          {formatMoney(item.unitCost || 0, item.currency)}
                      </div>
                  </div>
                  <div className="space-y-1">
                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Process</div>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-bold text-xs">
                          {formatMoney(item.programmingCost || 0, item.currency)}
                      </div>
                  </div>
              </div>
              
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-primary-50 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 p-2 rounded-lg">
                <Edit3 size={14} />
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmationModal 
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Service"
        message="Are you sure you want to remove this service from the catalog? It will no longer be available for selection in future quotes."
      />

      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="bg-primary-600 text-white p-3 rounded-2xl shadow-lg">
                  {isEditing ? <Edit3 size={24} /> : <Plus size={24} />}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                    {isEditing ? 'Modify Service' : 'New Service Configuration'}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Catalog Entry Details (OMR)</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-2 transition-colors">
                <X size={28} />
              </button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto bg-slate-50/30 dark:bg-slate-950/20">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Service Identity</label>
                    <input 
                      type="text" 
                      className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-50 dark:focus:ring-primary-900/30 bg-white dark:bg-slate-800 transition-all font-bold text-slate-800 dark:text-slate-100"
                      placeholder="e.g. Muscat Elite NFC Card"
                      value={currentSvc.name}
                      onChange={(e) => setCurrentSvc({...currentSvc, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Service Type</label>
                    <select 
                      className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none bg-white dark:bg-slate-800 dark:text-slate-100 font-bold"
                      value={currentSvc.type}
                      onChange={(e) => setCurrentSvc({...currentSvc, type: e.target.value as ServiceType})}
                    >
                      <option value="One-time">One-time Delivery</option>
                      <option value="Recurring">Subscription / Contract</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Service Description</label>
                    <textarea 
                      className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-primary-50 dark:focus:ring-primary-900/30 bg-white dark:bg-slate-800 transition-all h-24 text-slate-600 dark:text-slate-300 leading-relaxed font-medium"
                      placeholder="Detail the technical specifications and delivery scope..."
                      value={currentSvc.description}
                      onChange={(e) => setCurrentSvc({...currentSvc, description: e.target.value})}
                    ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Base Selling Price (OMR)</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-xs uppercase">OMR</div>
                          <input 
                            type="number" 
                            className="w-full pl-16 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm font-black text-xl text-primary-600 dark:text-primary-400 focus:ring-4 focus:ring-primary-500/10 outline-none"
                            value={currentSvc.basePrice}
                            step="0.1"
                            onChange={(e) => setCurrentSvc({...currentSvc, basePrice: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                    </div>
                    {currentSvc.type === 'Recurring' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Min. Contract Duration (Months)</label>
                        <input 
                          type="number" 
                          className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 shadow-sm font-bold"
                          value={currentSvc.minContractMonths}
                          onChange={(e) => setCurrentSvc({...currentSvc, minContractMonths: parseInt(e.target.value) || 1})}
                        />
                      </div>
                    )}
                    
                    <div className="space-y-4 col-span-full">
                      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-xs uppercase tracking-widest mb-1">
                        <Cog size={14} className="text-slate-400 dark:text-slate-500" />
                        Internal Cost Structure (OMR)
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Material Cost</label>
                            <input 
                              type="number" 
                              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 font-bold"
                              value={currentSvc.unitCost}
                              step="0.05"
                              onChange={(e) => setCurrentSvc({...currentSvc, unitCost: parseFloat(e.target.value) || 0})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">Process Cost</label>
                            <input 
                              type="number" 
                              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-100 font-bold"
                              value={currentSvc.programmingCost}
                              step="0.05"
                              onChange={(e) => setCurrentSvc({...currentSvc, programmingCost: parseFloat(e.target.value) || 0})}
                            />
                        </div>
                      </div>
                    </div>
                </div>

                <div className="bg-primary-50 dark:bg-primary-900/30 p-6 rounded-3xl border border-primary-100 dark:border-primary-800 flex items-start gap-4">
                  <Info className="text-primary-400 dark:text-primary-300 shrink-0" size={20} />
                  <div className="text-sm text-primary-900 dark:text-primary-100 leading-relaxed font-medium">
                    <span className="font-black">Financial Projection:</span> This service will have a total base cost of 
                    <span className="font-black"> {formatMoney((currentSvc.unitCost || 0) + (currentSvc.programmingCost || 0), 'OMR')}</span>.
                    {currentSvc.type === 'Recurring' ? 
                      ' Contract value will be calculated based on selected duration in the quote.' : 
                      ` Resulting in a gross profit of ${formatMoney((currentSvc.basePrice || 0) - ((currentSvc.unitCost || 0) + (currentSvc.programmingCost || 0)), 'OMR')} per unit.`
                    }
                  </div>
                </div>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 sticky bottom-0 z-10">
                <button onClick={() => setShowModal(false)} className="px-8 py-4 font-black uppercase tracking-widest text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">Discard</button>
                <button 
                  onClick={handleSave} 
                  className="bg-primary-600 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-700 shadow-xl shadow-primary-500/30 transition-all active:scale-95"
                >
                  {isEditing ? 'Update Service' : 'Commit to Catalog'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogView;