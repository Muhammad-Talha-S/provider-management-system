import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
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
  X,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import type { Provider } from "../types";
import { getMyProvider, patchMyProvider } from "../api/providers";

export const ProviderPage: React.FC = () => {
  const { currentUser, currentProvider, tokens, setCurrentProvider } = useApp();

  const isProviderAdmin = currentUser?.role === "Provider Admin";

  const [provider, setProvider] = useState<Provider | null>(currentProvider ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Draft state
  const [nameDraft, setNameDraft] = useState("");
  const [contactNameDraft, setContactNameDraft] = useState("");
  const [contactEmailDraft, setContactEmailDraft] = useState("");
  const [contactPhoneDraft, setContactPhoneDraft] = useState("");
  const [addressDraft, setAddressDraft] = useState("");

  const [emailNotifDraft, setEmailNotifDraft] = useState(false);
  const [smsNotifDraft, setSmsNotifDraft] = useState(false);
  const [languageDraft, setLanguageDraft] = useState<"English" | "German">("English");

  // Load provider from backend (source of truth)
  useEffect(() => {
    if (!tokens?.access) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await getMyProvider(tokens.access);
        setProvider(p);
        setCurrentProvider(p);
      } catch (e: any) {
        setError(e?.message || "Failed to load provider");
        setProvider(currentProvider ?? null);
      } finally {
        setLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens?.access]);

  // Sync draft with provider
  useEffect(() => {
    if (!provider) return;
    setNameDraft(provider.name || "");
    setContactNameDraft(provider.contactName || "");
    setContactEmailDraft(provider.contactEmail || "");
    setContactPhoneDraft(provider.contactPhone || "");
    setAddressDraft(provider.address || "");

    setEmailNotifDraft(!!provider.communicationPreferences?.emailNotifications);
    setSmsNotifDraft(!!provider.communicationPreferences?.smsNotifications);
    setLanguageDraft(
      (provider.communicationPreferences?.preferredLanguage as "English" | "German") || "English"
    );
  }, [provider]);

  const createdAtLabel = useMemo(() => {
    if (!provider?.createdAt) return "—";
    try {
      return new Date(provider.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return provider.createdAt;
    }
  }, [provider?.createdAt]);

  const handleEdit = () => {
    if (!isProviderAdmin) return;
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    if (!provider) return;

    setNameDraft(provider.name || "");
    setContactNameDraft(provider.contactName || "");
    setContactEmailDraft(provider.contactEmail || "");
    setContactPhoneDraft(provider.contactPhone || "");
    setAddressDraft(provider.address || "");
    setEmailNotifDraft(!!provider.communicationPreferences?.emailNotifications);
    setSmsNotifDraft(!!provider.communicationPreferences?.smsNotifications);
    setLanguageDraft(
      (provider.communicationPreferences?.preferredLanguage as "English" | "German") || "English"
    );
  };

  const handleSave = async () => {
    if (!isProviderAdmin || !tokens?.access || !provider) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await patchMyProvider(tokens.access, {
        name: nameDraft,
        contactName: contactNameDraft,
        contactEmail: contactEmailDraft,
        contactPhone: contactPhoneDraft,
        address: addressDraft,
        communicationPreferences: {
          emailNotifications: emailNotifDraft,
          smsNotifications: smsNotifDraft,
          preferredLanguage: languageDraft,
        },
      });

      setProvider(updated);
      setCurrentProvider(updated);
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || "Failed to save provider");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Loading provider...</p>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="p-8">
        <p className="text-gray-500">No provider information available.</p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl text-gray-900 mb-2">Provider Information</h1>
          <p className="text-sm text-gray-500">Manage your provider profile and contact details</p>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>

        {isProviderAdmin && !isEditing && (
          <Button onClick={handleEdit}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit Provider
          </Button>
        )}

        {isEditing && (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
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
                    <Input className="mt-1.5" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
                  ) : (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{provider.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Provider ID</Label>
                  <div className="mt-1.5">
                    <Badge variant="outline">{provider.id}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <div className="mt-1.5">
                  <Badge variant={provider.status === "Active" ? "default" : "secondary"}>
                    {provider.status}
                  </Badge>
                </div>
              </div>

              <div>
                <Label>Member Since</Label>
                <p className="text-sm text-gray-600 mt-1.5">{createdAtLabel}</p>
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
                  <Input className="mt-1.5" value={contactNameDraft} onChange={(e) => setContactNameDraft(e.target.value)} />
                ) : (
                  <p className="text-sm text-gray-900 mt-1.5">{provider.contactName}</p>
                )}
              </div>

              <div>
                <Label>Email</Label>
                {isEditing ? (
                  <Input className="mt-1.5" type="email" value={contactEmailDraft} onChange={(e) => setContactEmailDraft(e.target.value)} />
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{provider.contactEmail}</span>
                  </div>
                )}
              </div>

              <div>
                <Label>Phone</Label>
                {isEditing ? (
                  <Input className="mt-1.5" type="tel" value={contactPhoneDraft} onChange={(e) => setContactPhoneDraft(e.target.value)} />
                ) : (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{provider.contactPhone}</span>
                  </div>
                )}
              </div>

              <div>
                <Label>Address</Label>
                {isEditing ? (
                  <Input className="mt-1.5" value={addressDraft} onChange={(e) => setAddressDraft(e.target.value)} />
                ) : (
                  <div className="flex items-start gap-2 mt-1.5">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="text-sm text-gray-900">{provider.address}</span>
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
                  checked={isEditing ? emailNotifDraft : provider.communicationPreferences.emailNotifications}
                  disabled={!isEditing}
                  onCheckedChange={(v) => setEmailNotifDraft(!!v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-xs text-gray-500 mt-1">Receive urgent updates via SMS</p>
                </div>
                <Switch
                  checked={isEditing ? smsNotifDraft : provider.communicationPreferences.smsNotifications}
                  disabled={!isEditing}
                  onCheckedChange={(v) => setSmsNotifDraft(!!v)}
                />
              </div>

              <div>
                <Label>Preferred Language</Label>
                {isEditing ? (
                  <select
                    value={languageDraft}
                    onChange={(e) => setLanguageDraft(e.target.value as any)}
                    className="w-full mt-1.5 h-10 px-3 border border-gray-300 rounded-md"
                  >
                    <option value="English">English</option>
                    <option value="German">German</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900 mt-1.5">
                    {provider.communicationPreferences.preferredLanguage}
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
                  <p className="text-2xl text-gray-900">{provider.metrics.totalUsers}</p>
                  <p className="text-xs text-gray-600">Total Users</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl text-gray-900">{provider.metrics.activeSpecialists}</p>
                  <p className="text-xs text-gray-600">Active Specialists</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl text-gray-900">{provider.metrics.activeServiceOrders}</p>
                  <p className="text-xs text-gray-600">Active Orders</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <FileCheck className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl text-gray-900">{provider.metrics.activeContracts}</p>
                  <p className="text-xs text-gray-600">Active Contracts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {!isProviderAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Note</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Only Provider Admin can edit provider details.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderPage;
