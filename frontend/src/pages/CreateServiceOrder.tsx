import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  MapPin, 
  FileText, 
  Filter,
  Check
} from 'lucide-react';
import { mockServiceRequests, mockContracts, mockSpecialists, mockServiceOffers } from '../data/mockData';

export const CreateServiceOrder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const offerId = searchParams.get('offerId');
  
  // Get offer details
  const offer = mockServiceOffers.find(o => o.id === offerId);
  const serviceRequest = offer ? mockServiceRequests.find(sr => sr.id === offer.serviceRequestId) : null;
  const contract = serviceRequest ? mockContracts.find(c => c.id === serviceRequest.linkedContractId) : null;
  const selectedSpecialist = offer ? mockSpecialists.find(s => s.id === offer.specialistId) : null;

  const [formData, setFormData] = useState({
    startDate: serviceRequest?.startDate || '',
    endDate: serviceRequest?.endDate || '',
    specialistId: selectedSpecialist?.id || '',
    location: '',
    notes: ''
  });

  const [skillFilter, setSkillFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');

  // Filter available specialists
  const filteredSpecialists = mockSpecialists.filter(specialist => {
    // Skill filter
    if (skillFilter && specialist.skills) {
      const hasSkill = specialist.skills.some(skill => 
        skill.toLowerCase().includes(skillFilter.toLowerCase())
      );
      if (!hasSkill) return false;
    }

    // Availability filter
    if (availabilityFilter !== 'all' && specialist.availability !== availabilityFilter) {
      return false;
    }

    return true;
  });

  const handleSpecialistSelect = (specialistId: string) => {
    setFormData({ ...formData, specialistId });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In real app, would create service order in backend
    navigate('/service-orders');
  };

  if (!offer || !serviceRequest || !contract) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Service offer not found.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl text-gray-900 mb-2">Create Service Order</h1>
        <p className="text-sm text-gray-500">
          Convert accepted offer to service order and assign specialist
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reference Information */}
            <Card>
              <CardHeader>
                <CardTitle>Reference Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Service Request</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{serviceRequest.id}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{serviceRequest.title}</p>
                  </div>

                  <div>
                    <Label>Contract Reference</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{contract.id}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{contract.title}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Role</Label>
                    <p className="text-sm text-gray-900 mt-1.5">{serviceRequest.role}</p>
                  </div>

                  <div>
                    <Label>Technology</Label>
                    <p className="text-sm text-gray-900 mt-1.5">{serviceRequest.technology}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Period */}
            <Card>
              <CardHeader>
                <CardTitle>Time Period</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="mt-1.5"
                      required
                    />
                  </div>

                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="mt-1.5"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., Frankfurt, Germany"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-1.5"
                    required
                  />
                </div>

                <div>
                  <Label>Total Man-Days</Label>
                  <p className="text-sm text-gray-900 mt-1.5">{serviceRequest.totalManDays} days</p>
                </div>
              </CardContent>
            </Card>

            {/* Specialist Selection */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Assign Specialist</CardTitle>
                  <Badge variant="outline">{filteredSpecialists.length} available</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="skillFilter" className="text-xs">Filter by Skill</Label>
                    <Input
                      id="skillFilter"
                      placeholder="e.g., React, AWS"
                      value={skillFilter}
                      onChange={(e) => setSkillFilter(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div className="w-48">
                    <Label htmlFor="availabilityFilter" className="text-xs">Availability</Label>
                    <select
                      id="availabilityFilter"
                      value={availabilityFilter}
                      onChange={(e) => setAvailabilityFilter(e.target.value)}
                      className="w-full mt-1 h-10 px-3 border border-gray-300 rounded-md"
                    >
                      <option value="all">All</option>
                      <option value="Available">Available</option>
                      <option value="Partially Booked">Partially Booked</option>
                      <option value="Fully Booked">Fully Booked</option>
                    </select>
                  </div>
                </div>

                {/* Specialist List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredSpecialists.map(specialist => (
                    <div
                      key={specialist.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        formData.specialistId === specialist.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleSpecialistSelect(specialist.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm text-gray-900">{specialist.name}</h4>
                            {formData.specialistId === specialist.id && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {specialist.experienceLevel}
                            </Badge>
                            <Badge 
                              variant={
                                specialist.availability === 'Available' ? 'default' :
                                specialist.availability === 'Partially Booked' ? 'secondary' :
                                'outline'
                              }
                              className="text-xs"
                            >
                              {specialist.availability}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Grade {specialist.performanceGrade}
                            </Badge>
                          </div>

                          {specialist.skills && (
                            <div className="flex flex-wrap gap-1">
                              {specialist.skills.slice(0, 4).map((skill, idx) => (
                                <span key={idx} className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-gray-900">€{specialist.averageDailyRate}</p>
                          <p className="text-xs text-gray-500">per day</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredSpecialists.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No specialists match the current filters.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  placeholder="Add any special instructions or requirements..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md resize-none"
                />
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="pb-4 border-b border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Selected Specialist</p>
                  {formData.specialistId ? (
                    <>
                      <p className="text-sm text-gray-900">
                        {mockSpecialists.find(s => s.id === formData.specialistId)?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {mockSpecialists.find(s => s.id === formData.specialistId)?.materialNumber}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Not selected</p>
                  )}
                </div>

                <div className="pb-4 border-b border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Duration</p>
                  <p className="text-sm text-gray-900">
                    {formData.startDate && formData.endDate ? (
                      <>
                        {new Date(formData.startDate).toLocaleDateString()} - {new Date(formData.endDate).toLocaleDateString()}
                      </>
                    ) : (
                      'Not set'
                    )}
                  </p>
                </div>

                <div className="pb-4 border-b border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Total Man-Days</p>
                  <p className="text-sm text-gray-900">{serviceRequest.totalManDays} days</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Estimated Cost</p>
                  <p className="text-lg text-gray-900">€{offer.totalCost.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-xs text-gray-700 mb-4">
                  By creating this service order, you confirm that all details are correct and the specialist is available for the specified period.
                </p>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={!formData.specialistId || !formData.startDate || !formData.endDate || !formData.location}
                >
                  Create Service Order
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateServiceOrder;