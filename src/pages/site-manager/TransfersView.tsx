import { ArrowRightLeft, Calendar, ChevronLeft, ChevronRight, Package, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { supabase } from "../../integrations/supabase/client";
import { Transfer } from '../../types';

const ITEMS_PER_PAGE = 20;

export function SiteManagerTransfersView() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadTransfers();
  }, []);

  const loadTransfers = async () => {
    const { data } = await supabase
      .from('transfers')
      .select(`
        *,
        item:items(id, name, item_type),
        from_site:sites!transfers_from_site_id_fkey(id, name, location),
        to_site:sites!transfers_to_site_id_fkey(id, name, location),
        transferred_by_profile:profiles!transfers_transferred_by_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setTransfers(data as unknown as Transfer[]);
    }
    setLoading(false);
  };

  const getFilteredTransfers = () => {
    if (!searchTerm) return transfers;

    return transfers.filter(t =>
      t.item?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.from_site?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.to_site?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.transferred_by_profile?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredTransfers = getFilteredTransfers();
  const totalPages = Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransfers = filteredTransfers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading transfers history...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transfers History</h1>
          <p className="text-gray-600 mt-2">View all item transfer activities</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by item, site, or person..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0db2ad] focus:border-transparent"
              />
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredTransfers.length)} of {filteredTransfers.length} transfer{filteredTransfers.length !== 1 ? 's' : ''}
          </div>

          {filteredTransfers.length === 0 ? (
            <div className="text-center py-12">
              <ArrowRightLeft className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No transfers found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Item</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">From</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">→</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">To</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Quantity</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">By</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedTransfers.map((transfer) => (
                      <tr key={transfer.id} className="hover:bg-gray-50 transition">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{transfer.item?.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            transfer.item?.item_type === 'equipment'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {transfer.item?.item_type}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm">
                            {transfer.from_site ? (
                              <div>
                                <div className="font-medium text-gray-900">{transfer.from_site.name}</div>
                                <div className="text-gray-500 text-xs">{transfer.from_site.location}</div>
                              </div>
                            ) : (
                              <span className="text-gray-500 italic">Storage</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <ArrowRightLeft className="w-4 h-4 text-gray-400 mx-auto" />
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm">
                            {transfer.to_site ? (
                              <div>
                                <div className="font-medium text-gray-900">{transfer.to_site.name}</div>
                                <div className="text-gray-500 text-xs">{transfer.to_site.location}</div>
                              </div>
                            ) : (
                              <span className="text-gray-500 italic">Storage</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-semibold text-gray-900">{transfer.quantity}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {transfer.transferred_by_profile?.full_name}
                              </div>
                              <div className="text-gray-500 text-xs">
                                {transfer.transferred_by_profile?.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(transfer.created_at ?? "")}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center space-x-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center space-x-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
