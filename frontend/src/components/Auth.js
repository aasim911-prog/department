import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Users } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    student_id: '',
    role: 'student',
    department: 'AI/ML',
    semester: 1,
    identifier: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e, type) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === 'login') {
        const response = await axios.post(`${API}/auth/login`, {
          identifier: formData.identifier,
          password: formData.password
        });
        toast.success('Login successful!');
        onLogin(response.data.token, response.data.user);
      } else {
        const registerData = {
          name: formData.name,
          role: formData.role,
          department: formData.department,
          ...(formData.role === 'teacher' ? { email: formData.email } : { student_id: formData.student_id, semester: parseInt(formData.semester) })
        };
        const response = await axios.post(`${API}/auth/register`, registerData);
        toast.success('Registration successful!');
        onLogin(response.data.token, response.data.user);
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ffffff 50%, #dbeafe 100%)' }}>
      <div className="w-full max-w-5xl fade-in">
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk', background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI/ML Dashboard
          </h1>
          <p className="text-lg md:text-xl text-gray-600" style={{ fontFamily: 'Inter' }}>Student Marks Management System</p>
        </div>

        <Card className="glass-card border-0" data-testid="auth-card">
          <CardHeader>
            <CardTitle className="text-2xl" style={{ fontFamily: 'Space Grotesk' }}>Welcome Back</CardTitle>
            <CardDescription>Sign in or create an account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" onValueChange={(v) => setIsLogin(v === 'login')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={(e) => handleSubmit(e, 'login')} className="space-y-4" data-testid="login-form">
                  <div>
                    <Label htmlFor="identifier">Email or Student ID</Label>
                    <Input
                      id="identifier"
                      data-testid="login-identifier-input"
                      placeholder="teacher@example.com or STU001"
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      data-testid="login-password-input"
                      placeholder="student or teacher"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Students use 'student', Teachers use 'teacher'</p>
                  </div>
                  <Button type="submit" className="w-full button-primary text-white" disabled={loading} data-testid="login-submit-btn">
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={(e) => handleSubmit(e, 'register')} className="space-y-4" data-testid="register-form">
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                      <SelectTrigger data-testid="role-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student" data-testid="role-student-option"><div className="flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Student</div></SelectItem>
                        <SelectItem value="teacher" data-testid="role-teacher-option"><div className="flex items-center gap-2"><Users className="w-4 h-4" /> Teacher</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      data-testid="register-name-input"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  {formData.role === 'teacher' ? (
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        data-testid="register-email-input"
                        placeholder="teacher@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="student_id">Student ID</Label>
                        <Input
                          id="student_id"
                          data-testid="register-student-id-input"
                          placeholder="STU001"
                          value={formData.student_id}
                          onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="semester">Current Semester</Label>
                        <Select value={formData.semester.toString()} onValueChange={(v) => setFormData({ ...formData, semester: parseInt(v) })}>
                          <SelectTrigger data-testid="semester-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                              <SelectItem key={sem} value={sem.toString()} data-testid={`semester-${sem}-option`}>Semester {sem}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      data-testid="register-department-input"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full button-secondary text-white" disabled={loading} data-testid="register-submit-btn">
                    {loading ? 'Registering...' : 'Register'}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">Password: 'student' for students, 'teacher' for teachers</p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;