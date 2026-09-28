import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { patientService, DuplicateMatch } from '../../services/patientService';
import { usePractice } from '../../hooks/usePractice';
import type { PatientSex } from '../../types/models';
import {
  UserPlus,
  ArrowLeft,
  AlertTriangle,
  AlertCircle,
  User,
  Phone,
  Home,
  ShieldAlert,
} from 'lucide-react';

export const CreatePatientPage: React.FC = () => {
  const navigate = useNavigate();
  const { activePractice } = usePractice();

  // Form State
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<PatientSex | ''>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Address
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

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);

  const handleDuplicateCheck = async () => {
    if (!firstName.trim() || !lastName.trim()) return;
    try {
      const matches = await patientService.checkPotentialDuplicates({
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || undefined,
        phone: phone || undefined,
        email: email || undefined,
      });
      setDuplicates(matches);
      if (matches.length === 0) {
        setDuplicateAcknowledged(true);
      }
    } catch {
      // Non-blocking duplicate check error
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    // If duplicates found and user hasn't acknowledged yet
    if (duplicates.length > 0 && !duplicateAcknowledged) {
      setError('Please review potential duplicate patients or confirm registration.');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);

      const newPatient = await patientService.createPatient({
        practice_id: activePractice?.id || '',
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        last_name: lastName.trim(),
        preferred_name: preferredName.trim() || null,
        date_of_birth: dateOfBirth || null,
        sex: sex ? (sex as PatientSex) : null,
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
        status: 'active',
      });

      navigate(`/app/patients/${newPatient.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register patient.';
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="create-patient-page">
      <div className="page-header">
        <div className="page-header-text">
          <Link to="/app/patients" className="back-link">
            <ArrowLeft size={16} />
            <span>Back to Patient Registry</span>
          </Link>
          <h1 className="page-title">Register New Patient</h1>
          <p className="page-subtitle">
            Create an administrative demographic profile in {activePractice?.name}
          </p>
        </div>
      </div>

      {error && (
        <div className="auth-error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Duplicate Warning Banner */}
      {duplicates.length > 0 && (
        <div className="duplicate-warning-banner">
          <div className="duplicate-warning-header">
            <AlertTriangle size={20} className="warning-icon" />
            <div>
              <h4 className="warning-title">Potential Duplicate Patient(s) Detected</h4>
              <p className="warning-subtitle">
                The following existing patient records match the entered details in this practice:
              </p>
            </div>
          </div>
          <ul className="duplicate-matches-list">
            {duplicates.map((d) => (
              <li key={d.id} className="duplicate-match-item">
                <Link
                  to={`/app/patients/${d.id}`}
                  target="_blank"
                  className="duplicate-link"
                >
                  <span className="font-semibold">{d.patient_identifier}:</span>{' '}
                  {d.last_name}, {d.first_name} ({d.matchReason})
                  {d.date_of_birth && ` • DOB: ${d.date_of_birth}`}
                  {d.phone && ` • Phone: ${d.phone}`}
                </Link>
              </li>
            ))}
          </ul>
          <div className="duplicate-acknowledge-box">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={duplicateAcknowledged}
                onChange={(e) => setDuplicateAcknowledged(e.target.checked)}
              />
              <span>
                I have verified that this is a separate patient and wish to proceed with registration.
              </span>
            </label>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="patient-form">
        {/* Identity & Demographics */}
        <div className="form-card">
          <div className="form-card-header">
            <User size={18} className="text-teal-600" />
            <h3>Identity &amp; Demographics</h3>
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
                  onBlur={handleDuplicateCheck}
                  placeholder="e.g. Eleanor"
                />
              </div>

              <div className="form-group">
                <label htmlFor="middleName">Middle Name</label>
                <input
                  id="middleName"
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="e.g. Jane"
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
                  onBlur={handleDuplicateCheck}
                  placeholder="e.g. Vance"
                />
              </div>
            </div>

            <div className="form-grid-3 mt-4">
              <div className="form-group">
                <label htmlFor="preferredName">Preferred Name</label>
                <input
                  id="preferredName"
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="e.g. Ellie"
                />
              </div>

              <div className="form-group">
                <label htmlFor="dateOfBirth">Date of Birth</label>
                <input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  onBlur={handleDuplicateCheck}
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
                  onBlur={handleDuplicateCheck}
                  placeholder="e.g. +44 7700 900077"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={handleDuplicateCheck}
                  placeholder="e.g. eleanor.vance@example.co.uk"
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
                  placeholder="e.g. 14 High Street"
                />
              </div>

              <div className="form-group">
                <label htmlFor="addressLine2">Address Line 2 (Optional)</label>
                <input
                  id="addressLine2"
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="e.g. Flat 3B"
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
                  placeholder="e.g. London"
                />
              </div>

              <div className="form-group">
                <label htmlFor="stateProvince">County / Province</label>
                <input
                  id="stateProvince"
                  type="text"
                  value={stateProvince}
                  onChange={(e) => setStateProvince(e.target.value)}
                  placeholder="e.g. Greater London"
                />
              </div>

              <div className="form-group">
                <label htmlFor="postalCode">Postal Code</label>
                <input
                  id="postalCode"
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. SW1A 1AA"
                />
              </div>

              <div className="form-group">
                <label htmlFor="country">Country Code</label>
                <input
                  id="country"
                  type="text"
                  maxLength={2}
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  placeholder="GB"
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
                  placeholder="e.g. Robert Vance"
                />
              </div>

              <div className="form-group">
                <label htmlFor="emergencyRelationship">Relationship</label>
                <input
                  id="emergencyRelationship"
                  type="text"
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                  placeholder="e.g. Spouse / Next of Kin"
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
                  placeholder="e.g. +44 7700 900088"
                />
              </div>

              <div className="form-group">
                <label htmlFor="emergencyEmail">Emergency Email (Optional)</label>
                <input
                  id="emergencyEmail"
                  type="email"
                  value={emergencyEmail}
                  onChange={(e) => setEmergencyEmail(e.target.value)}
                  placeholder="e.g. robert.vance@example.co.uk"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Administrative Notes (strictly non-clinical) */}
        <div className="form-card">
          <div className="form-card-header">
            <Home size={18} className="text-teal-600" />
            <div>
              <h3>Administrative Notes</h3>
              <p className="card-note">
                Strictly for scheduling, billing instructions, or access preferences.
                Do NOT enter clinical diagnoses or assessments here.
              </p>
            </div>
          </div>
          <div className="form-card-body">
            <div className="form-group">
              <textarea
                id="administrativeNotes"
                rows={3}
                value={administrativeNotes}
                onChange={(e) => setAdministrativeNotes(e.target.value)}
                placeholder="e.g. Prefers morning appointments; requires ground floor access."
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <Link to="/app/patients" className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || (duplicates.length > 0 && !duplicateAcknowledged)}
          >
            <UserPlus size={16} />
            <span>{submitting ? 'Registering Patient...' : 'Register Patient'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
