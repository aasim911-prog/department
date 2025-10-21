import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Award, TrendingUp, BookOpen, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const StudentDashboard = ({ user, token, onLogout }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/student/${user.student_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0f2fe 100%)' }}>
        <div className="text-2xl text-blue-600 font-semibold">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0f2fe 100%)' }}>
        <div className="text-xl text-gray-600">No data available</div>
      </div>
    );
  }

  // Prepare chart data
  const semesterChartData = Object.keys(dashboardData.semester_data).map(key => {
    const semData = dashboardData.semester_data[key];
    return {
      semester: `Sem ${semData.semester}`,
      SGPA: semData.sgpa,
      subjects: semData.subjects.length
    };
  }).filter(d => d.SGPA > 0);

  const getColorForGrade = (gradePoint) => {
    if (gradePoint >= 9) return '#10b981'; // green
    if (gradePoint >= 8) return '#3b82f6'; // blue
    if (gradePoint >= 7) return '#f59e0b'; // amber
    if (gradePoint >= 6) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #ffffff 50%, #e0f2fe 100%)' }}>
      {/* Header */}
      <div className="glass-card border-0 border-b p-6 mb-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Space Grotesk', color: '#1e40af' }} data-testid="student-dashboard-title">
              Student Dashboard
            </h1>
            <p className="text-gray-600 mt-1" data-testid="student-name">Welcome, {user.name} ({user.student_id})</p>
          </div>
          <Button onClick={onLogout} variant="outline" className="flex items-center gap-2" data-testid="logout-btn">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 fade-in">
          <Card className="stat-card glass-card border-0" data-testid="cgpa-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Overall CGPA</CardTitle>
              <Award className="w-5 h-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" style={{ color: '#eab308' }} data-testid="cgpa-value">
                {dashboardData.cgpa.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card glass-card border-0" data-testid="current-semester-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Current Semester</CardTitle>
              <BookOpen className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" style={{ color: '#3b82f6' }} data-testid="current-semester-value">
                {user.semester}
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card glass-card border-0" data-testid="department-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Department</CardTitle>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold" style={{ color: '#8b5cf6' }} data-testid="department-value">
                {user.department}
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card glass-card border-0" data-testid="semesters-completed-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Semesters Data</CardTitle>
              <BarChart3 className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" style={{ color: '#10b981' }} data-testid="semesters-completed-value">
                {semesterChartData.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SGPA Chart */}
        {semesterChartData.length > 0 && (
          <Card className="glass-card border-0 mb-8 slide-in" data-testid="sgpa-chart-card">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Space Grotesk' }}>Semester-wise SGPA Performance</CardTitle>
              <CardDescription>Your academic performance across semesters</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={semesterChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis dataKey="semester" stroke="#6366f1" style={{ fontFamily: 'Inter' }} />
                  <YAxis domain={[0, 10]} stroke="#6366f1" style={{ fontFamily: 'Inter' }} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e0e7ff', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontFamily: 'Inter' }} />
                  <Line type="monotone" dataKey="SGPA" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#2563eb', r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Semester Details */}
        <Card className="glass-card border-0 slide-in" data-testid="semester-details-card">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Space Grotesk' }}>Semester-wise Performance</CardTitle>
            <CardDescription>View detailed marks and grades for each semester</CardDescription>
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

              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                const semData = dashboardData.semester_data[`semester_${sem}`];
                const hasData = semData.subjects.length > 0;

                const subjectChartData = semData.subjects.map(item => ({
                  subject: item.subject.code,
                  'Final Marks': item.marks.final_exam || 0,
                  'Grade Point': item.grade_point,
                  fill: getColorForGrade(item.grade_point)
                }));

                return (
                  <TabsContent key={sem} value={sem.toString()} className="space-y-6">
                    {hasData ? (
                      <>
                        {/* SGPA Display */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg" data-testid={`semester-${sem}-sgpa-banner`}>
                          <div className="text-center">
                            <p className="text-lg mb-2">Semester {sem} SGPA</p>
                            <p className="text-5xl font-bold" data-testid={`semester-${sem}-sgpa-value`}>{semData.sgpa.toFixed(2)}</p>
                            <p className="text-sm mt-2">Total Credits: {semData.total_credits}</p>
                          </div>
                        </div>

                        {/* Subject-wise Bar Chart */}
                        {subjectChartData.length > 0 && (
                          <div data-testid={`semester-${sem}-chart`}>
                            <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Subject-wise Performance</h3>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={subjectChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                                <XAxis dataKey="subject" stroke="#6366f1" style={{ fontFamily: 'Inter', fontSize: '12px' }} />
                                <YAxis stroke="#6366f1" style={{ fontFamily: 'Inter' }} />
                                <Tooltip
                                  contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e0e7ff', borderRadius: '8px' }}
                                />
                                <Legend wrapperStyle={{ fontFamily: 'Inter' }} />
                                <Bar dataKey="Final Marks" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                                <Bar dataKey="Grade Point" fill="#10b981" radius={[8, 8, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {/* Subjects Table */}
                        <div className="overflow-x-auto" data-testid={`semester-${sem}-table`}>
                          <table className="w-full">
                            <thead>
                              <tr className="border-b-2 border-blue-200">
                                <th className="text-left p-3 font-semibold">Subject</th>
                                <th className="text-left p-3 font-semibold">Code</th>
                                <th className="text-left p-3 font-semibold">Credits</th>
                                <th className="text-left p-3 font-semibold">Internal 1</th>
                                <th className="text-left p-3 font-semibold">Internal 2</th>
                                <th className="text-left p-3 font-semibold">Internal 3</th>
                                <th className="text-left p-3 font-semibold">Final Exam</th>
                                <th className="text-left p-3 font-semibold">Grade Point</th>
                              </tr>
                            </thead>
                            <tbody>
                              {semData.subjects.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-200 hover:bg-blue-50" data-testid={`subject-row-${item.subject.code}`}>
                                  <td className="p-3">{item.subject.name}</td>
                                  <td className="p-3">{item.subject.code}</td>
                                  <td className="p-3">{item.subject.credits}</td>
                                  <td className="p-3">{item.marks.internal1 ?? '-'}</td>
                                  <td className="p-3">{item.marks.internal2 ?? '-'}</td>
                                  <td className="p-3">{item.marks.internal3 ?? '-'}</td>
                                  <td className="p-3 font-semibold">{item.marks.final_exam ?? '-'}</td>
                                  <td className="p-3">
                                    <span
                                      className="px-3 py-1 rounded-full text-white font-semibold"
                                      style={{ backgroundColor: getColorForGrade(item.grade_point) }}
                                      data-testid={`grade-point-${item.subject.code}`}
                                    >
                                      {item.grade_point.toFixed(1)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-500" data-testid={`no-data-sem-${sem}`}>
                        No marks available for Semester {sem}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
