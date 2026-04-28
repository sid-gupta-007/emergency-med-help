import { Hospital, Ambulance, BloodBank } from '../types';

export const ghaziabadCenter = { lat: 28.6650, lng: 77.4300 };

export const hospitals: Hospital[] = [
    { id: "h1", name: "Yashoda Super Specialty Hospital", location: { lat: 28.6506, lng: 77.3400 }, bedsAvailable: 45, icuAvailable: 12, contact: "+91-120-4567890" },
    { id: "h2", name: "Max Super Speciality Hospital", location: { lat: 28.6385, lng: 77.3200 }, bedsAvailable: 20, icuAvailable: 5, contact: "+91-120-2345678" }
];

export const ambulances: Ambulance[] = [
    { id: "a1", vehicleNumber: "UP14-AB-1234", location: { lat: 28.6670, lng: 77.4320 }, isAvailable: true, status: "idle" },
    { id: "a2", vehicleNumber: "UP14-XY-9876", location: { lat: 28.6600, lng: 77.4250 }, isAvailable: true, status: "idle" }
];

export const bloodBanks: BloodBank[] = [
    { id: "b1", name: "Rotary Blood Bank", location: { lat: 28.6700, lng: 77.4400 }, inventory: { "O+": 20, "A+": 15, "B+": 30 } }
];
