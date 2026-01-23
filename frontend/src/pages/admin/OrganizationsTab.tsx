import { useState } from 'react';
import { useInstitutions, useCreateInstitution, useDeleteInstitution } from '../../hooks/useInstitutions';
import { useDepartments, useCreateDepartment, useDeleteDepartment } from '../../hooks/useDepartments';
import { getErrorMessage } from '../../utils/errorHandling';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { Institution, Department } from '../../types';

type DeleteTarget =
  | { type: 'institution'; item: Institution }
  | { type: 'department'; item: Department };

export default function OrganizationsTab() {
  const { data: institutions = [], isLoading: loadingInst } = useInstitutions();
  const { data: departments = [], isLoading: loadingDept } = useDepartments();
  const createInst = useCreateInstitution();
  const deleteInst = useDeleteInstitution();
  const createDept = useCreateDepartment();
  const deleteDept = useDeleteDepartment();

  const [expandedInsts, setExpandedInsts] = useState<Set<number>>(new Set());
  const [showInstForm, setShowInstForm] = useState(false);
  const [showDeptForm, setShowDeptForm] = useState<number | null>(null); // institution_id or null
  const [instForm, setInstForm] = useState({ name: '', description: '' });
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const toggleExpand = (id: number) => {
    const next = new Set(expandedInsts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedInsts(next);
  };

  const getDepartmentsFor = (instId: number) => departments.filter(d => d.institution_id === instId);

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createInst.mutateAsync({ name: instForm.name, description: instForm.description || undefined });
      setShowInstForm(false);
      setInstForm({ name: '', description: '' });
      setMessage({ type: 'success', text: 'Institution created' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDeptForm) return;
    try {
      await createDept.mutateAsync({
        name: deptForm.name,
        description: deptForm.description || undefined,
        institution_id: showDeptForm,
      });
      setShowDeptForm(null);
      setDeptForm({ name: '', description: '' });
      setMessage({ type: 'success', text: 'Department created' });
      // Expand the institution to show the new department
      setExpandedInsts(prev => new Set([...prev, showDeptForm]));
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'institution') {
        await deleteInst.mutateAsync(deleteTarget.item.id);
        setMessage({ type: 'success', text: 'Institution deleted' });
      } else {
        await deleteDept.mutateAsync(deleteTarget.item.id);
        setMessage({ type: 'success', text: 'Department deleted' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
    setDeleteTarget(null);
  };

  if (loadingInst || loadingDept) {
    return <div className="py-8"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Institutions</p>
          <p className="text-2xl font-bold">{institutions.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Departments</p>
          <p className="text-2xl font-bold">{departments.length}</p>
        </Card>
      </div>

      {/* Add Institution Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowInstForm(true)}>+ Add Institution</Button>
      </div>

      {/* Institutions with Nested Departments */}
      <div className="space-y-3">
        {institutions.length === 0 ? (
          <Card>
            <p className="text-gray-500 text-center py-4">No institutions yet. Create one to get started.</p>
          </Card>
        ) : (
          institutions.map(inst => {
            const instDepts = getDepartmentsFor(inst.id);
            const isExpanded = expandedInsts.has(inst.id);

            return (
              <Card key={inst.id} className="overflow-hidden">
                {/* Institution Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleExpand(inst.id)}
                      className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div>
                      <p className="font-semibold text-gray-900">{inst.name}</p>
                      {inst.description && <p className="text-sm text-gray-500">{inst.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {instDepts.length} department{instDepts.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => setShowDeptForm(inst.id)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      + Dept
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ type: 'institution', item: inst })}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Nested Departments */}
                {isExpanded && (
                  <div className="mt-4 ml-9 border-l-2 border-gray-200 pl-4 space-y-2">
                    {instDepts.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">No departments in this institution</p>
                    ) : (
                      instDepts.map(dept => (
                        <div
                          key={dept.id}
                          className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-800">{dept.name}</p>
                            {dept.description && <p className="text-sm text-gray-500">{dept.description}</p>}
                          </div>
                          <button
                            onClick={() => setDeleteTarget({ type: 'department', item: dept })}
                            className="text-red-600 hover:underline text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Add Institution Modal */}
      <Modal isOpen={showInstForm} onClose={() => setShowInstForm(false)} title="Add Institution">
        <form onSubmit={handleCreateInstitution} className="space-y-4">
          <Input
            label="Name"
            required
            value={instForm.name}
            onChange={v => setInstForm({ ...instForm, name: v })}
            placeholder="Institution name"
          />
          <Textarea
            label="Description"
            value={instForm.description}
            onChange={v => setInstForm({ ...instForm, description: v })}
            rows={3}
            placeholder="Optional description"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowInstForm(false)}>Cancel</Button>
            <Button type="submit" loading={createInst.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Add Department Modal */}
      <Modal
        isOpen={!!showDeptForm}
        onClose={() => setShowDeptForm(null)}
        title={`Add Department to ${institutions.find(i => i.id === showDeptForm)?.name || ''}`}
      >
        <form onSubmit={handleCreateDepartment} className="space-y-4">
          <Input
            label="Name"
            required
            value={deptForm.name}
            onChange={v => setDeptForm({ ...deptForm, name: v })}
            placeholder="Department name"
          />
          <Textarea
            label="Description"
            value={deptForm.description}
            onChange={v => setDeptForm({ ...deptForm, description: v })}
            rows={3}
            placeholder="Optional description"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDeptForm(null)}>Cancel</Button>
            <Button type="submit" loading={createDept.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.type === 'institution' ? 'Delete Institution' : 'Delete Department'}
        message={
          deleteTarget?.type === 'institution'
            ? `Delete "${deleteTarget.item.name}" and all its departments? This cannot be undone.`
            : `Delete department "${deleteTarget?.item.name}"? This cannot be undone.`
        }
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
}
