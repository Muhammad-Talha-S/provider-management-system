import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Users, 
  Package, 
  FileCheck, 
  UserCheck,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { Badge } from '../components/ui/badge';

export const ProviderPage: React.FC = () => {
  const { currentUser, currentProvider } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const isProviderAdmin = currentUser?.role === 'Provider Admin';

  if (!currentProvider) {
    return (
      <div className="p-8">
        <p className="text-gray-500">No provider information available.</p>
      </div>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    // In real app, would save to backend
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl text-gray-900 mb-2">Provider Information</h1>
          <p className="text-sm text-gray-500">
            Manage your provider profile and contact details
          </p>
        </div>
        
        {isProviderAdmin && !isEditing && (
          <Button onClick={handleEdit}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Provider
          </Button>
        )}

        {isEditing && (
          <div className="flex gap-2">
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Provider Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Provider Name</Label>
                  {isEditing ? (
                    <Input className="mt-1.5" defaultValue={currentProvider.name} />
                  ) : (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{currentProvider.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Provider ID</Label>
                  <div className="mt-1.5">
                    <Badge variant="outline">{currentProvider.id}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <div className="mt-1.5">
                  <Badge variant={currentProvider.status === 'Active' ? 'default' : 'secondary'}>
                    {currentProvider.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label>Member Since</Label>
                <p className="text-sm text-gray-600 mt-1.5">
                  {new Date(currentProvider.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Contact Person</Label>
                {isEditing ? (
                  <Input className="mt-1.5" defaultValue={currentProvider.contactName} />
                ) : (
                  <p className="text-sm text-gray-900 mt-1.5">{currentProvider.contactName}</p>
                )}
              </div>

              <div>
                <Label>Email</Label>
                {isEditing ? (
                  <Input className="mt-1.5" type="email" defaultValue={currentProvider.contactEmail} />
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{currentProvider.contactEmail}</span>
                  </div>
                )}
              </div>

              <div>
                <Label>Phone</Label>
                {isEditing ? (
                  <Input className="mt-1.5" type="tel" defaultValue={currentProvider.contactPhone} />
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{currentProvider.contactPhone}</span>
                  </div>
                )}
              </div>

              <div>
                <Label>Address</Label>
                {isEditing ? (
                  <Input className="mt-1.5" defaultValue={currentProvider.address} />
                ) : (
                  <div className="flex items-start gap-2 mt-1.5">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="text-sm text-gray-900">{currentProvider.address}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Communication Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-gray-500 mt-1">Receive updates via email</p>
                </div>
                <Switch 
                  checked={currentProvider.communicationPreferences.emailNotifications}
                  disabled={!isEditing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-xs text-gray-500 mt-1">Receive urgent updates via SMS</p>
                </div>
                <Switch 
                  checked={currentProvider.communicationPreferences.smsNotifications}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <Label>Preferred Language</Label>
                {isEditing ? (
                  <select className="w-full mt-1.5 h-10 px-3 border border-gray-300 rounded-md">
                    <option value="English">English</option>
                    <option value="German">German</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900 mt-1.5">
                    {currentProvider.communicationPreferences.preferredLanguage}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metrics Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Provider Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl text-gray-900">{currentProvider.metrics.totalUsers}</p>
                  <p className="text-xs text-gray-600">Total Users</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl text-gray-900">{currentProvider.metrics.activeSpecialists}</p>
                  <p className="text-xs text-gray-600">Active Specialists</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl text-gray-900">{currentProvider.metrics.activeServiceOrders}</p>
                  <p className="text-xs text-gray-600">Active Orders</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl text-gray-900">{currentProvider.metrics.activeContracts}</p>
                  <p className="text-xs text-gray-600">Active Contracts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProviderPage;