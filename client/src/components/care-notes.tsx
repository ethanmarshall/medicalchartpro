import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { type Patient } from "@shared/schema";

interface CareNotesProps {
  patient: Patient;
}

interface CareNote {
  id: string;
  patientId: string;
  content: string;
  category: string;
  createdBy: string;
  createdAt: string;
}

export function CareNotes({ patient }: CareNotesProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExpandModal, setShowExpandModal] = useState(false);
  const [selectedExpandNote, setSelectedExpandNote] = useState<CareNote | null>(null);
  const [newNote, setNewNote] = useState({
    content: "",
    category: "nursing"
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: careNotes = [], isLoading } = useQuery<CareNote[]>({
    queryKey: ['/api/patients', patient.id, 'care-notes'],
  });

  const addNoteMutation = useMutation({
    mutationFn: async (noteData: { content: string; category: string }) => {
      return await apiRequest(`/api/patients/${patient.id}/care-notes`, 'POST', noteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'care-notes'] });
      setShowAddModal(false);
      setNewNote({ content: "", category: "nursing" });
      toast({
        title: "Care Note Added",
        description: "New care note has been successfully recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to add care note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return await apiRequest(`/api/patients/${patient.id}/care-notes/${noteId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients', patient.id, 'care-notes'] });
      toast({
        title: "Care Note Deleted",
        description: "Care note has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete care note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddNote = () => {
    if (!newNote.content.trim()) return;
    addNoteMutation.mutate(newNote);
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Are you sure you want to delete this care note? This action cannot be undone.')) {
      deleteNoteMutation.mutate(noteId);
    }
  };

  const canDelete = user?.role === 'instructor' || user?.role === 'admin';

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'nursing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'physician': return 'bg-green-100 text-green-800 border-green-200';
      case 'therapy': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'medication': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-medical-text-primary">
          <i className="fas fa-notes-medical mr-2 text-medical-primary"></i>Care Notes
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-medical-primary text-white text-sm font-medium rounded-lg hover:bg-medical-primary/90 transition-colors"
          data-testid="button-add-care-note"
        >
          <i className="fas fa-plus mr-2"></i>Add Note
        </button>
      </div>

      {/* Care Notes List */}
      {careNotes.length === 0 ? (
        <div className="text-center py-8 text-medical-text-muted">
          <i className="fas fa-notes-medical text-4xl mb-4 opacity-30"></i>
          <p className="text-lg font-medium mb-2">No Care Notes Recorded</p>
          <p className="text-sm">Click "Add Note" to document patient care.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {careNotes
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((note) => (
              <div
                key={note.id}
                className="p-4 border border-medical-border rounded-lg bg-white"
                data-testid={`care-note-${note.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(note.category)}`}>
                    {note.category.charAt(0).toUpperCase() + note.category.slice(1)}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-medical-text-muted">
                      {new Date(note.createdAt).toLocaleString()}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedExpandNote(note);
                        setShowExpandModal(true);
                      }}
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      data-testid={`expand-care-note-${note.id}`}
                      title="View full care note"
                    >
                      <i className="fas fa-eye text-xs"></i>
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        data-testid={`delete-care-note-${note.id}`}
                        title="Delete care note"
                      >
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-medical-text-primary leading-relaxed">
                  {note.content && note.content.length > 100 
                    ? `${note.content.substring(0, 100)}...` 
                    : note.content
                  }
                </p>
                <div className="mt-2 text-xs text-medical-text-muted">
                  By: {user?.username || 'Staff'}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-medical-border max-w-md w-full">
            <div className="p-6 border-b border-medical-border">
              <h3 className="text-lg font-semibold text-medical-text-primary">
                <i className="fas fa-notes-medical mr-2"></i>Add Care Note
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-medical-text-secondary mb-2">
                  Category *
                </label>
                <select
                  value={newNote.category}
                  onChange={(e) => setNewNote({...newNote, category: e.target.value})}
                  className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary"
                  data-testid="select-note-category"
                >
                  <option value="nursing">Nursing</option>
                  <option value="physician">Physician</option>
                  <option value="therapy">Therapy</option>
                  <option value="medication">Medication</option>
                  <option value="assessment">Assessment</option>
                  <option value="teaching">Patient Teaching</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-medical-text-secondary mb-2">
                  Note Content *
                </label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                  className="w-full px-3 py-2 border border-medical-border rounded-lg focus:ring-2 focus:ring-medical-primary focus:border-medical-primary h-32 resize-none"
                  placeholder="Enter detailed care note..."
                  data-testid="textarea-note-content"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-medical-border">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                data-testid="button-cancel-note"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={!newNote.content.trim() || addNoteMutation.isPending}
                className="px-6 py-2 bg-medical-primary text-white text-sm font-medium rounded-lg hover:bg-medical-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="button-save-note"
              >
                {addNoteMutation.isPending ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Saving...</>
                ) : (
                  <><i className="fas fa-save mr-2"></i>Save Note</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expand Care Note Modal */}
      {showExpandModal && selectedExpandNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                <i className="fas fa-notes-medical mr-2"></i>Care Note Details
              </h3>
              <button
                onClick={() => setShowExpandModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                data-testid="button-close-expand-care-note-modal"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedExpandNote.category)}`}>
                    {selectedExpandNote.category.charAt(0).toUpperCase() + selectedExpandNote.category.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {new Date(selectedExpandNote.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {user?.username || 'Staff'}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Note Content</label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded border min-h-[150px] whitespace-pre-wrap leading-relaxed">
                  {selectedExpandNote.content}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}