/**
 * SignUp.js
 * Description: This page is where users can sign up and create an account
 * Frontend Author: Shelyn Del Mundo
 * Backend Author: Shelyn Del Mundo
 *                  Donald Jans Uy
 * Date: 2024-10-23
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	createUserWithEmailAndPassword,
	sendEmailVerification,
} from 'firebase/auth';
import { auth } from '../../_utils/firebase';
import logo from '../../assets/logo/SocialGrdnLogo.png';
import LongButton from '../../components/Buttons/longButton';
import AddressAutocomplete from '../../components/AutoComplete/AddressAutoComplete';
import BackButton from '../../components/Buttons/backButton';

export default function SignUp() {
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		firstname: '',
		lastname: '',
		username: '',
		profession: '',
		phoneNumber: '',
		userAddress: '',
		userCity: '',
		userProvince: '',
		userPostalCode: '',
	});
	const [errors, setErrors] = useState({});
	const [emailMessage, setEmailMessage] = useState('');
	const navigate = useNavigate();

	// Handle form input changes and update the form data
	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prevState) => ({
			...prevState,
			[name]: value,
		}));
	};

	// Handle address selection from the autocomplete component
	const handleAddressSelect = (addressData) => {
		setFormData((prevState) => ({
			...prevState,
			userAddress: addressData.addressLine1,
			userCity: addressData.city,
			userProvince: addressData.province,
			userPostalCode: addressData.postalCode,
		}));
	};

	// Validate the form data before submitting to the server
	const validateForm = () => {
		const newErrors = {};
		const {
			email,
			password,
			firstname,
			lastname,
			username,
			profession,
			phoneNumber,
		} = formData;

		// Check if the email is valid which should contain '@' and '.'
		if (!email.includes('@') || !email.includes('.')) {
			newErrors.email = 'Please enter a valid email address.';
		}
		// Check if the password is at least 6 characters long and contains a number
		if (password.length < 6 || !/\d/.test(password)) {
			newErrors.password =
				'Password must be at least 6 characters long and contain a number.';
		}
		// Check if the first name and last name only contain letters and spaces
		if (!firstname.match(/^[a-zA-Z\s]+$/)) {
			newErrors.firstname =
				'First name is required and should only contain letters.';
		}
		// Check if the last name only contain letters and spaces
		if (!lastname.match(/^[a-zA-Z\s]+$/)) {
			newErrors.lastname = 'Last name is required should only contain letters.';
		}
		// Check if the username only contains letters, numbers, and underscores
		if (!username.match(/^\w+$/)) {
			newErrors.username =
				'Username is required and should only contain letters, numbers, and underscores.';
		}
		// Check if the phone number is valid.
		if (
			phoneNumber &&
			(!/^[\d+\-()\s]+$/.test(phoneNumber) ||
				phoneNumber.replace(/\D/g, '').length !== 10)
		) {
			newErrors.phoneNumber = 'Invalid phone number.';
		}

		// This checks if the phone number is valid and formats it to (123) 456-7890
		if (phoneNumber) {
			const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');

			// Check if the cleaned phone number has exactly 10 digits
			if (cleanedPhoneNumber.length === 10) {
				formData.phoneNumber = formatPhoneNumber(phoneNumber);
			} else {
				newErrors.phoneNumber =
					'Invalid phone number. Must contain exactly 10 digits.';
			}
		}
		// Check if the profession only contains letters, numbers, and spaces
		if (profession && !profession.match(/^[a-zA-Z0-9\s]+$/)) {
			newErrors.profession =
				'Profession should only contain letters, numbers, and spaces.';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// This is a helper function that formats the phone number to (123) 456-7890
	const formatPhoneNumber = (number) => {
		// Extract only digits from the phone number
		const cleaned = number.replace(/\D/g, '');

		// Format as (123) 456-7890 if it's 10 digits
		if (cleaned.length === 10) {
			return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
				6
			)}`;
		}

		// Return the original number if it can't be formatted
		return number;
	};

	// Handle the sign up form submission
	const handleSignUp = async (event) => {
		event.preventDefault();
	
		// Validate the form data before submitting to the server and return if there are errors
		if (!validateForm()) {
			return;
		}
	
		// Send the form data to the server to create a new user
		try {
			const { email, password } = formData;
	
			console.log('Data being sent to the server:', formData);
	
			// Ensure the backend URL is defined
			if (!process.env.REACT_APP_BACKEND_URL) {
				throw new Error('Backend URL is not configured');
			}
	
			// This is the POST request to add the user data to the database
			const response = await fetch('https://socialgrdn-backend.onrender.com/api/users/register', {
				method: 'POST',
				credentials: 'include',
				headers: { 
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});
	
			// Log the full response for debugging
			console.log('Server response:', {
				status: response.status,
				statusText: response.statusText
			});
	
			// If the response is successful, create a new user in Firebase and send a verification email
			if (response.ok) {
				try {
					// Create user in Firebase
					const userCredential = await createUserWithEmailAndPassword(
						auth,
						email,
						password
					);
					const user = userCredential.user;
	
					// Send verification email
					await sendEmailVerification(user);
	
					// Set success message and navigate
					setEmailMessage('Verification email sent! Please check your inbox.');
					navigate('/VerifyEmail');
				} catch (firebaseError) {
					// Handle Firebase-specific errors
					console.error('Firebase registration error:', firebaseError);
					
					// Check if the error is due to existing user
					if (firebaseError.code === 'auth/email-already-in-use') {
						setErrors({ 
							general: 'An account with this email already exists. Please sign in or use a different email.' 
						});
					} else {
						setErrors({ 
							general: `Firebase registration failed: ${firebaseError.message}` 
						});
					}
				}
			} else {
				// Handle non-successful HTTP responses
				const errorText = await response.text();
				console.error('Server error response:', errorText);
	
				// Set more specific error messages based on status
				switch (response.status) {
					case 400:
						setErrors({ general: 'Invalid input. Please check your information.' });
						break;
					case 409:
						setErrors({ general: 'A user with this email or username already exists.' });
						break;
					case 500:
						setErrors({ general: 'Server error. Please try again later.' });
						break;
					default:
						setErrors({ general: `Registration failed: ${errorText}` });
				}
			}
		} catch (error) {
			// Handle network errors or other unexpected errors
			console.error('Signup process error:', error);
	
			// Provide user-friendly error messages
			if (error.message === 'Failed to fetch') {
				setErrors({ 
					general: 'Unable to connect to the server. Please check your internet connection.' 
				});
			} else if (error.message === 'Backend URL is not configured') {
				setErrors({ 
					general: 'Server configuration error. Please contact support.' 
				});
			} else {
				setErrors({ 
					general: `Unexpected error: ${error.message}` 
				});
			}
		}
	};

	return (
		<div className="bg-main-background relative">
			<div className="flex flex-col items-center justify-center gap-2 min-h-screen mx-2 pt-8 bg-main-background ">
				<div className='fixed pt-8 top-0 left-0 w-full bg-main-background'>
					<BackButton />
				</div>
				<div className="flex flex-col items-center justify-center gap-2 min-h-screen m-2 pt-4 pb-20 bg-main-background">

					<strong className="text-3xl">Welcome!</strong>
					<img src={logo} alt="Social Grdn Logo" className="w-auto h-auto" />

					<div className="w-full sm:w-3/4 md:w-2/3 lg:w-1/2 xl:w-1/3 text-left px-4">
						<p className="font-bold">Sign up to get started</p>
					</div>

					{/* Sign up form */}
					<form
						className="flex flex-col gap-4 px-4 w-full sm:w-3/4 md:w-2/3 lg:w-1/2 xl:w-1/3"
						onSubmit={handleSignUp}
					>
						{!errors.email ? (
							<input
								type="text"
								name="email"
								placeholder="Email"
								value={formData.email}
								onChange={handleChange}
								className="p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						) : (
							<input
								type="text"
								name="email"
								placeholder="Email"
								value={formData.email}
								onChange={handleChange}
								className="p-2 border border-red-500 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						)}

						{errors.email && (
							<p className="text-red-500 text-sm">{errors.email}</p>
						)}

						{!errors.password ? (
							<input
								type="password"
								name="password"
								placeholder="Password"
								value={formData.password}
								onChange={handleChange}
								className="p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						) : (
							<input
								type="password"
								name="password"
								placeholder="Password"
								value={formData.password}
								onChange={handleChange}
								className="p-2 border border-red-500 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						)}
						{errors.password && (
							<p className="text-red-500 text-sm">{errors.password}</p>
						)}

						{!errors.firstname ? (
							<input
								type="text"
								name="firstname"
								placeholder="First Name"
								value={formData.firstname}
								onChange={handleChange}
								className="p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						) : (
							<input
								type="text"
								name="firstname"
								placeholder="First Name"
								value={formData.firstname}
								onChange={handleChange}
								className="p-2 border border-red-500 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						)}
						{errors.firstname && (
							<p className="text-red-500 text-sm">{errors.firstname}</p>
						)}

						{!errors.lastname ? (
							<input
								type="text"
								name="lastname"
								placeholder="Last Name"
								value={formData.lastname}
								onChange={handleChange}
								className="p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						) : (
							<input
								type="text"
								name="lastname"
								placeholder="Last Name"
								value={formData.lastname}
								onChange={handleChange}
								className="p-2 border border-red-500 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						)}
						{errors.lastname && (
							<p className="text-red-500 text-sm">{errors.lastname}</p>
						)}

						{!errors.username ? (
							<input
								type="text"
								name="username"
								placeholder="Username"
								value={formData.username}
								onChange={handleChange}
								className="p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						) : (
							<input
								type="text"
								name="username"
								placeholder="Username"
								value={formData.username}
								onChange={handleChange}
								className="p-2 border border-red-500 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						)}
						{errors.username && (
							<p className="text-red-500 text-sm">{errors.username}</p>
						)}

						<p className="text-gray-600 italic">Optional</p>

						<input
							type="text"
							placeholder="Profession"
							name="profession"
							value={formData.profession}
							onChange={handleChange}
							className="p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
						/>
						{errors.profession && (
							<p className="text-red-500 text-sm">{errors.profession}</p>
						)}

						<AddressAutocomplete
							onAddressSelect={handleAddressSelect}
							countryCodes={['ca']}
						/>

						<input
							type="tel"
							placeholder="Phone Number"
							name="phoneNumber"
							value={formData.phoneNumber}
							onChange={handleChange}
							className="p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
						/>

						{errors.phoneNumber && (
							<p className="text-red-500 text-sm">{errors.phoneNumber}</p>
						)}

						{/* Sign up button */}
						<LongButton
							buttonName="Sign up"
							type="submit"
							className="py-2 w-full bg-green-600 text-white font-bold"
						/>
						{errors.general && <p className="text-red-500">{errors.general}</p>}
						{emailMessage && <p className="text-green-500">{emailMessage}</p>}
					</form>

					{/* Already a member button */}
					<div className="px-4 block w-full sm:w-3/4 md:w-2/3 lg:w-1/2 xl:w-1/3">
						<p>
							By signing up, you agree to the <strong>Terms, Conditions</strong>{' '}
							and <strong>Privacy Policy</strong>.
						</p>
						<LongButton
							buttonName="Already a member?"
							className="p-2 w-full rounded shadow-lg bg-green-200 font-bold"
							pagePath="/SignIn"
						/>
					</div>
				</div>
				<div className="fixed bottom-0 h-12 bg-main-background w-full">
				</div>
			</div>
		</div>
	);
}
