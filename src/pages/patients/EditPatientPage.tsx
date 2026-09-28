import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import type { Patient, PatientSex, PatientStatus } from '../../types/models';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  User,
  Phone,
  ShieldAlert,
  Home,
  Lock,
} from 'lucide-react';

export const EditPatientPage: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<PatientSex | ''>('');
  const [status, setStatus] = useState<PatientStatus>('active');

  // Contact
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('GB');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyEmail, setEmergencyEmail] = useState('');

  // Administrative Notes
  const [administrativeNotes, setAdministrativeNotes] = useState('');

  useEffect(() => {
    async function loadPatient() {
      if (!patientId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await patientService.getPatientById(patientId);
        if (!data) {
          setError('Patient record not found.');
          return;
        }
        setPatient(data);
        setFirstName(data.first_name);
        setMiddleName(data.middle_name || '');
        setLastName(data.last_name);
        setPreferredName(data.preferred_name || '');
        setDateOfBirth(data.date_of_birth || '');
        setSex(data.sex || '');
        setStatus(data.status);
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setAddressLine1(data.address_line1 || '');
        setAddressLine2(data.address_line2 || '');
        setCity(data.city || '');
        setStateProvince(data.state_province || '');
        setPostalCode(data.postal_code || '');
        setCountry(data.country || 'GB');
        setEmergencyName(data.emergency_contact_name || '');
        setEmergencyRelationship(data.emergency_contact_relationship || '');
        setEmergencyPhone(data.emergency_contact_phone || '');
        setEmergencyEmail(data.emergency_contact_email || '');
        setAdministrativeNotes(data.administrative_notes || '');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load patient.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
    loadPatient();
  }, [patientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    if (!patientId) return;

    try {
      setError(null);
      setSubmitting(true);

      await patientService.updatePatient(patientId, {
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        last_name: lastName.trim(),
        preferred_name: preferredName.trim() || null,
        date_of_birth: dateOfBirth || null,
        sex: sex ? (sex as PatientSex) : null,
        status: status !== 'archived' ? status : undefined, // Archiving is handled explicitly on profile page
        phone: phone.trim() || null,
        email: email.trim() || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        city: city.trim() || null,
        state_province: stateProvince.trim() || null,
        postal_code: postalCode.trim() || null,
        country: country.trim() || 'GB',
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_relationship: emergencyRelationship.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
        emergency_contact_email: emergencyEmail.trim() || null,
        administrative_notes: administrativeNotes.trim() || null,
      });

      navigate(`/app/patients/${patientId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save changes.';
      setError(msg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="table-loading-container">
        <div className="loading-spinner" />
        <p>Loading patient for editing...</p>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="empty-patient-state">
        <AlertCircle size={48} className="text-danger" />
        <h3>Cannot Edit Patient</h3>
        <p>{error}</p>
        <Link to="/app/patients" className="btn-secondary mt-4">
          <ArrowLeft size={16} />
          <span>Return to Registry</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="edit-patient-page">
      <div className="page-header">
        <div className="page-header-text">
          <Link to={`/app/patients/${patientId}`} className="back-link">
            <ArrowLeft size={16} />
            <span>Cancel and Return to Profile</span>
          </Link>
          <h1 className="page-title">Edit Patient Record</h1>
          <p className="page-subtitle">
            Update demographic details for {patient?.first_name} {patient?.last_name}
          </p>
        </div>

        <div className="immutable-identifier-badge">
          <Lock size={14} />
          <span>Patient ID: <strong>{patient?.patient_identifier}</strong></span>
        </div>
      </div>

      {error && (
        <div className="auth-error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="patient-form">
        {/* Demographics Card */}
        <div className="form-card">
          <div className="form-card-header">
            <User size={18} className="text-teal-600" />
            <h3>Demographics</h3>
          </div>
          <div className="form-card-body">
            <div className="form-grid-3">
              <div className="form-group">
                <label htmlFor="firstName">
                  First Name <span className="text-danger">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="middleName">Middle Name</label>
                <input
                  id="middleName"
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">
                  Last Name <span className="text-danger">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid-4 mt-4">
              <div className="form-group">
                <label htmlFor="preferredName">Preferred Name</label>
                <input
                  id="preferredName"
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="dateOfBirth">Date of Birth</label>
                <input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="sex">Administrative Sex</label>
                <select
                  id="sex"
                  value={sex}
                  onChange={(e) => setSex(e.target.value as PatientSex)}
                >
                  <option value="">Select sex...</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PatientStatus)}
                  disabled={patient?.status === 'archived'}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  {patient?.status === 'archived' && (
                    <option value="archived">Archived</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="form-card">
          <div className="form-card-header">
            <Phone size={18} className="text-teal-600" />
            <h3>Contact Information</h3>
          </div>
          <div className="form-card-body">
            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid-2 mt-4">
              <div className="form-group">
                <label htmlFor="addressLine1">Address Line 1</label>
                <input
                  id="addressLine1"
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="addressLine2">Address Line 2</label>
                <input
                  id="addressLine2"
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid-4 mt-4">
              <div className="form-group">
                <label htmlFor="city">City / Town</label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="stateProvince">County / Province</label>
                <input
                  id="stateProvince"
                  type="text"
                  value={stateProvince}
                  onChange={(e) => setStateProvince(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="postalCode">Postal Code</label>
                <input
                  id="postalCode"
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="country">Country</label>
                <input
                  id="country"
                  type="text"
                  maxLength={2}
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="form-card">
          <div className="form-card-header">
            <ShieldAlert size={18} className="text-teal-600" />
            <h3>Emergency Contact</h3>
          </div>
          <div className="form-card-body">
            <div className="form-grid-2">
              <div className="form-group">
                <label htmlFor="emergencyName">Contact Name</label>
                <input
                  id="emergencyName"
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="emergencyRelationship">Relationship</label>
                <input
                  id="emergencyRelationship"
                  type="text"
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid-2 mt-4">
              <div className="form-group">
                <label htmlFor="emergencyPhone">Emergency Phone</label>
                <input
                  id="emergencyPhone"
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="emergencyEmail">Emergency Email</label>
                <input
                  id="emergencyEmail"
                  type="email"
                  value={emergencyEmail}
                  onChange={(e) => setEmergencyEmail(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Administrative Notes */}
        <div className="form-card">
          <div className="form-card-header">
            <Home size={18} className="text-teal-600" />
            <h3>Administrative Notes</h3>
          </div>
          <div className="form-card-body">
            <div className="form-group">
              <textarea
                id="administrativeNotes"
                rows={3}
                value={administrativeNotes}
                onChange={(e) => setAdministrativeNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <Link to={`/app/patients/${patientId}`} className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            <Save size={16} />
            <span>{submitting ? 'Saving Changes...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
