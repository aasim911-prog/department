import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LogOut, BookOpen, Users, TrendingUp, PlusCircle, Upload } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const TeacherDashboard = ({ user, token, onLogout }) => {
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectMarks, setSubjectMarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showUploadMarks, setShowUploadMarks] = useState(false);
  
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    semester: 1,
    credits: 3
  });

  const [marksForm, setMarksForm] = useState({
    student_id: '',
    subject_id: '',
    semester: 1,
    internal1: '',
    internal2: '',
    internal3: '',
    final_exam: ''
  });

  useEffect(() => {
    fetchSubjects();
    fetchStudents();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${API}/subjects?department=${user.department}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubjects(response.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to load subjects');
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/students?department=${user.department}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    }
  };

  const fetchSubjectMarks = async (subjectId) => {
    try {
      const response = await axios.get(`${API}/marks/subject/${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubjectMarks(response.data);
    } catch (error) {
      console.error('Error fetching marks:', error);
      toast.error('Failed to load marks');
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(
        `${API}/subjects`,
        { ...subjectForm, department: user.department },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Subject added successfully!');
      setShowAddSubject(false);
      setSubjectForm({ name: '', code: '', semester: 1, credits: 3 });
      fetchSubjects();
    } catch (error) {
      console.error('Error adding subject:', error);
      toast.error(error.response?.data?.detail || 'Failed to add subject');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadMarks = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const marksData = {
        student_id: marksForm.student_id,
        subject_id: marksForm.subject_id,
        semester: parseInt(marksForm.semester),
        internal1: marksForm.internal1 ? parseFloat(marksForm.internal1) : null,
        internal2: marksForm.internal2 ? parseFloat(marksForm.internal2) : null,
        internal3: marksForm.internal3 ? parseFloat(marksForm.internal3) : null,
        final_exam: marksForm.final_exam ? parseFloat(marksForm.final_exam) : null
      };
      await axios.post(`${API}/marks`, marksData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Marks uploaded successfully!');
      setShowUploadMarks(false);
      setMarksForm({ student_id: '', subject_id: '', semester: 1, internal1: '', internal2: '', internal3: '', final_exam: '' });
      if (selectedSubject) {
        fetchSubjectMarks(selectedSubject.id);
      }
    } catch (error) {
      console.error('Error uploading marks:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload marks');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    
    try {
      await axios.delete(`${API}/subjects/${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Subject deleted successfully!');
      fetchSubjects();
      if (selectedSubject?.id === subjectId) {
        setSelectedSubject(null);
        setSubjectMarks([]);
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject');
    }
  };

  const groupedSubjects = subjects.reduce((acc, subject) => {
    if (!acc[subject.semester]) acc[subject.semester] = [];
    acc[subject.semester].push(subject);
    return acc;
  }, {});

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0f2fe 100%)' }}>
      {/* Header */}
      <div className="glass-card border-0 border-b p-6 mb-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Space Grotesk', color: '#1e40af' }} data-testid="teacher-dashboard-title">
              Teacher Dashboard
            </h1>
            <p className="text-gray-600 mt-1" data-testid="teacher-name">Welcome, {user.name}</p>
          </div>
          <Button onClick={onLogout} variant="outline" className="flex items-center gap-2" data-testid="logout-btn">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 fade-in">
          <Card className="stat-card glass-card border-0" data-testid="total-subjects-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Subjects</CardTitle>
              <BookOpen className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#2563eb' }} data-testid="total-subjects-count">{subjects.length}</div>
            </CardContent>
          </Card>

          <Card className="stat-card glass-card border-0" data-testid="total-students-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
              <Users className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#10b981' }} data-testid="total-students-count">{students.length}</div>
            </CardContent>
          </Card>

          <Card className="stat-card glass-card border-0" data-testid="department-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Department</CardTitle>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#8b5cf6' }} data-testid="department-name">{user.department}</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Dialog open={showAddSubject} onOpenChange={setShowAddSubject}>
            <DialogTrigger asChild>
              <Button className="button-primary text-white flex items-center gap-2" data-testid="add-subject-btn">
                <PlusCircle className="w-4 h-4" /> Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="add-subject-dialog">
              <DialogHeader>
                <DialogTitle>Add New Subject</DialogTitle>
                <DialogDescription>Create a new subject for your department</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddSubject} className="space-y-4">
                <div>
                  <Label htmlFor="subject-name">Subject Name</Label>
                  <Input
                    id="subject-name"
                    data-testid="subject-name-input"
                    placeholder="Machine Learning"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="subject-code">Subject Code</Label>
                  <Input
                    id="subject-code"
                    data-testid="subject-code-input"
                    placeholder="ML101"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="subject-semester">Semester</Label>
                  <Select value={subjectForm.semester.toString()} onValueChange={(v) => setSubjectForm({ ...subjectForm, semester: parseInt(v) })}>
                    <SelectTrigger data-testid="subject-semester-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                        <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subject-credits">Credits</Label>
                  <Input
                    id="subject-credits"
                    type="number"
                    data-testid="subject-credits-input"
                    min="1"
                    max="6"
                    value={subjectForm.credits}
                    onChange={(e) => setSubjectForm({ ...subjectForm, credits: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full button-primary text-white" disabled={loading} data-testid="subject-submit-btn">
                  {loading ? 'Adding...' : 'Add Subject'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showUploadMarks} onOpenChange={setShowUploadMarks}>
            <DialogTrigger asChild>
              <Button className="button-secondary text-white flex items-center gap-2" data-testid="upload-marks-btn">
                <Upload className="w-4 h-4" /> Upload Marks
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="upload-marks-dialog">
              <DialogHeader>
                <DialogTitle>Upload Student Marks</DialogTitle>
                <DialogDescription>Enter marks for a student (Max: Internal=40, Final=100)</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUploadMarks} className="space-y-4">
                <div>
                  <Label htmlFor="marks-student">Student</Label>
                  <Select value={marksForm.student_id} onValueChange={(v) => setMarksForm({ ...marksForm, student_id: v })}>
                    <SelectTrigger data-testid="marks-student-select">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(student => (
                        <SelectItem key={student.id} value={student.id} data-testid={`student-option-${student.student_id}`}>
                          {student.name} ({student.student_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="marks-subject">Subject</Label>
                  <Select value={marksForm.subject_id} onValueChange={(v) => setMarksForm({ ...marksForm, subject_id: v })}>
                    <SelectTrigger data-testid="marks-subject-select">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code}) - Sem {subject.semester}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="marks-semester">Semester</Label>
                  <Select value={marksForm.semester.toString()} onValueChange={(v) => setMarksForm({ ...marksForm, semester: parseInt(v) })}>
                    <SelectTrigger data-testid="marks-semester-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                        <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="internal1">Internal 1 (Max 40)</Label>
                    <Input
                      id="internal1"
                      type="number"
                      data-testid="internal1-input"
                      placeholder="0-40"
                      min="0"
                      max="40"
                      step="0.5"
                      value={marksForm.internal1}
                      onChange={(e) => setMarksForm({ ...marksForm, internal1: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="internal2">Internal 2 (Max 40)</Label>
                    <Input
                      id="internal2"
                      type="number"
                      data-testid="internal2-input"
                      placeholder="0-40"
                      min="0"
                      max="40"
                      step="0.5"
                      value={marksForm.internal2}
                      onChange={(e) => setMarksForm({ ...marksForm, internal2: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="internal3">Internal 3 (Max 40)</Label>
                    <Input
                      id="internal3"
                      type="number"
                      data-testid="internal3-input"
                      placeholder="0-40"
                      min="0"
                      max="40"
                      step="0.5"
                      value={marksForm.internal3}
                      onChange={(e) => setMarksForm({ ...marksForm, internal3: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="final-exam">Final Exam (Max 100)</Label>
                    <Input
                      id="final-exam"
                      type="number"
                      data-testid="final-exam-input"
                      placeholder="0-100"
                      min="0"
                      max="100"
                      step="0.5"
                      value={marksForm.final_exam}
                      onChange={(e) => setMarksForm({ ...marksForm, final_exam: e.target.value })}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full button-secondary text-white" disabled={loading} data-testid="marks-submit-btn">
                  {loading ? 'Uploading...' : 'Upload Marks'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Subjects List */}
        <Card className="glass-card border-0 slide-in" data-testid="subjects-list-card">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Space Grotesk' }}>Subjects by Semester</CardTitle>
            <CardDescription>Manage subjects and view marks</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="1" className="w-full">
              <TabsList className="grid grid-cols-4 lg:grid-cols-8 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <TabsTrigger key={sem} value={sem.toString()} data-testid={`semester-tab-${sem}`}>
                    Sem {sem}
                  </TabsTrigger>
                ))}
              </TabsList>

              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <TabsContent key={sem} value={sem.toString()} className="space-y-4">
                  {groupedSubjects[sem]?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedSubjects[sem].map(subject => (
                        <Card key={subject.id} className="border-2 border-blue-100 hover:border-blue-300 transition-all" data-testid={`subject-card-${subject.code}`}>
                          <CardHeader>
                            <CardTitle className="text-lg">{subject.name}</CardTitle>
                            <CardDescription>{subject.code} • {subject.credits} Credits</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setSelectedSubject(subject);
                                  fetchSubjectMarks(subject.id);
                                }}
                                data-testid={`view-marks-btn-${subject.code}`}
                              >
                                View Marks
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteSubject(subject.id)}
                                data-testid={`delete-subject-btn-${subject.code}`}
                              >
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500" data-testid={`no-subjects-sem-${sem}`}>
                      No subjects added for Semester {sem}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Selected Subject Marks */}
        {selectedSubject && (
          <Card className="glass-card border-0 mt-6 fade-in" data-testid="subject-marks-card">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Space Grotesk' }}>
                Marks for {selectedSubject.name} ({selectedSubject.code})
              </CardTitle>
              <CardDescription>View all student marks for this subject</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-blue-200">
                      <th className="text-left p-3 font-semibold">Student ID</th>
                      <th className="text-left p-3 font-semibold">Internal 1</th>
                      <th className="text-left p-3 font-semibold">Internal 2</th>
                      <th className="text-left p-3 font-semibold">Internal 3</th>
                      <th className="text-left p-3 font-semibold">Final Exam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectMarks.length > 0 ? (
                      subjectMarks.map(mark => {
                        const student = students.find(s => s.id === mark.student_id);
                        return (
                          <tr key={mark.id} className="border-b border-gray-200 hover:bg-blue-50" data-testid={`mark-row-${student?.student_id}`}>
                            <td className="p-3">{student?.student_id || mark.student_id}</td>
                            <td className="p-3">{mark.internal1 ?? '-'}</td>
                            <td className="p-3">{mark.internal2 ?? '-'}</td>
                            <td className="p-3">{mark.internal3 ?? '-'}</td>
                            <td className="p-3 font-semibold">{mark.final_exam ?? '-'}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-500" data-testid="no-marks-message">
                          No marks uploaded yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;