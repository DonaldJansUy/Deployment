import React, { useState, useEffect } from 'react';
import {
	ref,
	uploadBytesResumable,
	getDownloadURL,
	deleteObject,
} from 'firebase/storage';
import { ref as databaseRef, onValue } from 'firebase/database';
import { storage, realtimeDb } from '../../_utils/firebase';
import InAppLogo from '../../components/Logo/inAppLogo';
import BackButton from '../../components/Buttons/backButton';
import NavBar from '../../components/Navbar/navbar';
import LongButton from '../../components/Buttons/longButton';
import AddressAutocomplete from '../../components/AutoComplete/AddressAutoComplete';
import zoneColor from '../../components/ZoneColor/zoneColor';
import Sprout from '../../assets/navbarAssets/sprout.png';
import { useUser } from '../../UserContext';
import { useNavigate, useParams } from 'react-router-dom';
import DeletionModal from '../../components/ListingComponents/deletionModal';

const EditProperty = () => {
	//Deletion modal
	const [isModalVisible, setIsModalVisible] = React.useState(false);
	const openModal = () => {
		setIsModalVisible(true);
		console.log('Deletion Modal Opened');
	};
	const closeModal = () => {
		setIsModalVisible(false);
	};
	//End of deletion modal

	const { id } = useParams();
	const { userId } = useUser();
	const navigate = useNavigate();

	const [primaryImage, setPrimaryImage] = useState(null); // Single image or null
	const [primaryImageUrl, setPrimaryImageUrl] = useState(''); // Initialize as an empty string for URL

	// Initialize image arrays as empty arrays to avoid undefined issues
	const [otherImages, setOtherImages] = useState([]); // Array of image files
	const [otherImageUrls, setOtherImageUrls] = useState([]); // Array of URLs for the other images

	const [imagesToDelete, setImagesToDelete] = useState([]);

	// Initialize selected zone with empty values to maintain consistent structure
	const [selectedZone, setSelectedZone] = useState({ value: '', color: '' }); // Zone with value and color

	// Initialize address-related states as empty strings
	const [latitude, setLatitude] = useState(''); // Ensure it's string type initially
	const [longitude, setLongitude] = useState(''); // Same here
	const [propertyName, setPropertyName] = useState('');
	const [addressLine1, setAddressLine1] = useState('');
	const [city, setCity] = useState('');
	const [province, setProvince] = useState('');
	const [postalCode, setPostalCode] = useState('');
	const [country, setCountry] = useState('');
	const [description, setDescription] = useState('');

	// Initialize dimensions with default empty strings to prevent NaN issues
	const [length, setLength] = useState('');
	const [width, setWidth] = useState('');
	const [height, setHeight] = useState('');

	// Soil type, amenities, possible crops, and restrictions as empty strings or arrays
	const [soilType, setSoilType] = useState('');
	const [amenities, setAmenities] = useState('None listed');
	const [cropInput, setCropInput] = useState('');

	// Possible crops initialized as an empty array for array-specific functions (e.g., `map`)
	const [possibleCrops, setPossibleCrops] = useState([]); // Array of crop names
	const [restrictions, setRestrictions] = useState('None listed');
	const [price, setPrice] = useState(''); // Price as a string initially for easier input handling

	// City zone data initialized as an empty object for reliable structure during data fetching
	const [cityZoneData, setCityZoneData] = useState({});

	// Error message states initialized as empty strings for consistent error handling
	const [imageErrorMsg, setImageErrorMsg] = useState('');
	const [propertyNameErrorMsg, setPropertyNameErrorMsg] = useState('');
	const [propertyPriceErrorMsg, setPropertyPriceErrorMsg] = useState('');
	const [addressErrorMsg, setAddressErrorMsg] = useState('');
	const [dimensionErrorMsg, setDimensionErrorMsg] = useState('');
	const [soilTypeErrorMsg, setSoilTypeErrorMsg] = useState('');
	const [possibleCropsErrorMsg, setPossibleCropsErrorMsg] = useState('');

	const deleteImageFromStorage = async (imageUrl) => {
		try {
			// Extract the path from the Firebase Storage URL
			const imageRef = ref(storage, imageUrl);
			await deleteObject(imageRef);
			console.log('Image deleted successfully from storage');
		} catch (error) {
			console.error('Error deleting image from storage:', error);
		}
	};

	const handleDeleteExistingImage = (urlToDelete, index) => {
		// Add URL to images to be deleted on submit
		setImagesToDelete((prev) => [...prev, urlToDelete]);
		// Remove from UI immediately
		setOtherImageUrls((prev) => prev.filter((_, i) => i !== index));
	};

	// Function to handle deletion of newly added images
	const handleDeleteNewImage = (index) => {
		setOtherImages((prev) => prev.filter((_, i) => i !== index));
	};

	// Fetch existing property data
	useEffect(() => {
		const fetchPropertyData = async () => {
			try {
				const response = await fetch(
					`${process.env.REACT_APP_BACKEND_URL}/api/getPropertyDetails?property_id=${id}`,
					{
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
						},
					}
				);

				if (!response.ok) throw new Error('Failed to fetch property data');

				const propertyData = await response.json();
				console.log('API Response:', propertyData);

				// Populate state with existing data
				setPropertyName(propertyData.property_name);
				setAddressLine1(propertyData.address_line1);
				setCity(propertyData.city);
				setProvince(propertyData.province);
				setPostalCode(propertyData.postal_code);
				setCountry(propertyData.country);
				setLatitude(propertyData.latitude?.toString() || '');
				setLongitude(propertyData.longitude?.toString() || '');
				setSelectedZone({
					value: propertyData.growth_zone,
					color: zoneColor(propertyData.growth_zone),
				});
				setDescription(propertyData.description);

				// Handle dimensions
				const [length, width, height] = propertyData.dimension
					?.replace(/[LWHx]/g, '')
					.split(' ')
					.filter(Boolean)
					.map((dim) => dim.trim()) || ['', '', ''];

				setLength(length);
				setWidth(width);
				setHeight(height);

				setSoilType(propertyData.soil_type);
				setAmenities(propertyData.amenities);
				// Set possible crops from the crops array
				setPossibleCrops(propertyData.crops || []);
				setRestrictions(propertyData.restrictions);
				setPrice(propertyData.rent_base_price?.toString() || '');
				setPrimaryImageUrl(propertyData.primaryImage || '');
				setOtherImageUrls(propertyData.otherImages || []);
			} catch (error) {
				console.error('Error fetching property data:', error);
			}
		};

		if (id) {
			fetchPropertyData();
		}
	}, [id]);

	// Fetch city zone data
	useEffect(() => {
		const dataRef = databaseRef(realtimeDb, 'cities');
		const unsubscribe = onValue(dataRef, (snapshot) => {
			try {
				const fetchedData = snapshot.val();
				setCityZoneData(fetchedData);
			} catch (err) {
				console.error('Error processing city zone data:', err);
			}
		});

		return () => unsubscribe();
	}, []);

	const handlePriceChange = (e) => {
		const value = e.target.value;
		if (value.length > 7) {
			setPropertyPriceErrorMsg('Price cannot exceed 7 digits');
			setPrice(value.slice(0, 7));
		} else {
			setPropertyPriceErrorMsg('');
			setPrice(value);
		}
	};

	const handlePrimaryImageChange = (e) => {
		if (e.target.files[0]) {
			setPrimaryImage(e.target.files[0]);
		}
	};

	const handleOtherImagesChange = (e) => {
		const selectedFiles = Array.from(e.target.files);
		setOtherImages(selectedFiles);
	};

	const handleAddressSelect = (addressData) => {
		if (addressData.province === 'Alberta') {
			setAddressLine1(addressData.addressLine1);
			setCity(addressData.city);
			setProvince(addressData.province);
			setPostalCode(addressData.postalCode);
			setCountry(addressData.country);
			setLatitude(addressData.latitude.toString());
			setLongitude(addressData.longitude.toString());
			setAddressErrorMsg('');

			const cityEntry = Object.entries(cityZoneData).find(
				([, data]) => data.name.toLowerCase() === addressData.city.toLowerCase()
			);

			if (cityEntry) {
				const [, cityData] = cityEntry;
				setSelectedZone({
					value: cityData.code,
					color: zoneColor(cityData.code),
				});
			}
		} else {
			// set it to blank if its error
			setAddressLine1('');
			setCity('');
			setProvince('');
			setPostalCode('');
			setCountry('');
			setLatitude('');
			setLongitude('');
			setSelectedZone({
				value: '',
				color: '',
			});
			setAddressErrorMsg('ERROR: Please select an address in Alberta');
		}
	};

	const uploadImage = async (image, path) => {
		const storageRef = ref(storage, path);
		const uploadTask = uploadBytesResumable(storageRef, image);

		return new Promise((resolve, reject) => {
			uploadTask.on(
				'state_changed',
				(snapshot) => {
					const progress =
						(snapshot.bytesTransferred / snapshot.totalBytes) * 100;
					console.log(`Upload progress: ${progress}%`);
				},
				(error) => {
					console.error('Image upload error: ', error);
					reject(error);
				},
				() => {
					getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
						console.log('Image available at', downloadURL);
						resolve(downloadURL);
					});
				}
			);
		});
	};

	const formValidation = () => {
		let isValid = true;
		if (!primaryImage && !primaryImageUrl) {
			setImageErrorMsg('Primary image is required');
			isValid = false;
		} else {
			setImageErrorMsg('');
		}
		if (!propertyName) {
			setPropertyNameErrorMsg('Property name is required');
			isValid = false;
		} else {
			setPropertyNameErrorMsg('');
		}
		if (!addressLine1) {
			setAddressErrorMsg('Please select an address in Alberta');
			isValid = false;
		} else {
			setAddressErrorMsg('');
		}
		if (!length || !width || !height) {
			setDimensionErrorMsg('Dimensions are required');
			isValid = false;
		} else {
			setDimensionErrorMsg('');
		}
		if (!soilType) {
			setSoilTypeErrorMsg('Soil type is required');
			isValid = false;
		} else {
			setSoilTypeErrorMsg('');
		}
		if (possibleCrops.length === 0) {
			setPossibleCropsErrorMsg('Possible crops are required');
			isValid = false;
		} else {
			setPossibleCropsErrorMsg('');
		}
		if (!price) {
			setPropertyPriceErrorMsg('Price is required');
			isValid = false;
		} else {
			setPropertyPriceErrorMsg('');
		}
		return isValid;
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		let isValid = formValidation();
		if (!isValid) {
			return false;
		}

		try {
			// Delete all images marked for deletion
			await Promise.all(
				imagesToDelete.map((imageUrl) => deleteImageFromStorage(imageUrl))
			);

			let updatedPrimaryImageUrl = primaryImageUrl;
			let updatedOtherImageUrls = [...otherImageUrls];

			if (primaryImage) {
				if (primaryImageUrl) {
					await deleteImageFromStorage(primaryImageUrl);
				}
				updatedPrimaryImageUrl = await uploadImage(
					primaryImage,
					`property-images/${id}/PrimaryPhoto/primary-${primaryImage.name}`
				);
			}

			if (otherImages.length > 0) {
				const newOtherImageUrls = await Promise.all(
					otherImages.map((image) =>
						uploadImage(
							image,
							`property-images/${id}/OtherImages/other-${image.name}`
						)
					)
				);
				updatedOtherImageUrls = [
					...updatedOtherImageUrls,
					...newOtherImageUrls,
				];
			}

			const formData = {
				userId: parseInt(userId),
				propertyId: parseInt(id),
				propertyName,
				addressLine1,
				city,
				province,
				postalCode,
				country,
				latitude: parseFloat(latitude),
				longitude: parseFloat(longitude),
				growthzone: selectedZone.value,
				description,
				length: parseFloat(length),
				width: parseFloat(width),
				height: parseFloat(height),
				soilType,
				amenities: amenities === '' ? 'None listed' : amenities,
				possibleCrops,
				restrictions: restrictions === '' ? 'None listed' : restrictions,
				price: parseFloat(price),
				primaryImageUrl: updatedPrimaryImageUrl,
				otherImageUrls: updatedOtherImageUrls,
			};

			// Log the formData before sending it
			console.log(
				'FormData being sent to the API:',
				JSON.stringify(formData, null, 2)
			);

			const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/updatePropertyListing/${id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});

			if (!response.ok) {
				throw new Error('Failed to update property details');
			}

			const result = await response.json();
			return result.propertyId;
		} catch (error) {
			console.error('Error updating property: ', error);
			return false;
		}
	};

	const renderZoneSection = () => (
		<div className="flex items-center gap-4">
			<label className="text-lg font-semibold" htmlFor="zone">
				Growth Zone:
			</label>
			<div className="flex-grow relative">
				<div className="w-full">
					{selectedZone.value ? (
						<div
							className="w-full p-2 border border-gray-400 rounded-lg shadow-lg"
							style={{
								backgroundColor: selectedZone.color,
								color: '#000000',
							}}
						>
							{selectedZone.value}
						</div>
					) : (
						<div className="w-full p-2 border border-gray-400 rounded-lg shadow-lg text-gray-500">
							Zone
						</div>
					)}
				</div>
			</div>
		</div>
	);

	return (
		<div className="bg-main-background relative">
			<div className="flex flex-col items-center justify-center gap-2 min-h-screen mx-2 pb-20 mt-14 bg-main-background">
				<div className="px-2 fixed top-0 left-0 w-auto sm:w-2/4 md:w-2/3 lg:w-1/2 xl:w-1/3 bg-main-background">
					<InAppLogo />
				</div>
				<div className="fixed top-10 flex w-full justify-between bg-main-background">
					<div className="flex-grow w-full">
						<BackButton />
					</div>
				</div>
				<div className="mt-4">
					<p className="text-2xl font-bold text-center">Edit your property</p>
				</div>

				<div className="px-4 block w-full sm:w-3/4 md:w-2/3 lg:w-1/2 xl:w-1/3">
					<form
						className="flex flex-col flex-grow w-full gap-4 mb-8"
						onSubmit={handleSubmit}
					>
						{/* Primary Image Upload */}
						<div>
							<p className="text-sm text-red-600">{imageErrorMsg}</p>
						</div>
						<div className="flex flex-col gap-4">
							<label className="text-lg font-semibold">Primary Image:</label>
							<input
								type="file"
								onChange={handlePrimaryImageChange}
								accept="image/*"
								className="p-2 border border-gray-400 rounded-lg"
							/>
							{primaryImage ? (
								<img
									src={URL.createObjectURL(primaryImage)}
									alt="Primary"
									className="w-full h-40 object-cover rounded-lg"
								/>
							) : (
								primaryImageUrl && (
									<img
										src={primaryImageUrl}
										alt="Primary"
										className="w-full h-40 object-cover rounded-lg"
									/>
								)
							)}
						</div>

						{/* Other Images Upload */}
						<div className="flex flex-col gap-4">
							<label className="text-lg font-semibold">Other Images:</label>
							<input
								type="file"
								onChange={handleOtherImagesChange}
								accept="image/*"
								multiple
								className="p-2 border border-gray-400 rounded-lg"
							/>
							<div className="flex flex-wrap gap-2">
								{otherImages.map((image, index) => (
									<div key={`new-${index}`} className="relative">
										<img
											src={URL.createObjectURL(image)}
											alt={`Other ${index + 1}`}
											className="w-20 h-20 object-cover rounded-lg"
										/>
										<button
											type="button"
											onClick={() => handleDeleteNewImage(index)}
											className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white flex items-center justify-center hover:bg-red-600 focus:outline-none"
										>
											×
										</button>
									</div>
								))}
								{otherImageUrls.map((url, index) => (
									<div key={`existing-${index}`} className="relative">
										<img
											src={url}
											alt={`Other ${index + 1}`}
											className="w-20 h-20 object-cover rounded-lg"
										/>
										<button
											type="button"
											onClick={() => handleDeleteExistingImage(url, index)}
											className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white flex items-center justify-center hover:bg-red-600 focus:outline-none"
										>
											×
										</button>
									</div>
								))}
							</div>
						</div>

						<div className="flex items-center gap-4">
							<label className="text-lg font-semibold">Property ID:</label>
							<input
								type="text"
								value={id}
								readOnly
								className="flex-grow p-2 border border-gray-400 rounded-lg shadow-lg bg-gray-100"
							/>
						</div>

						{/* Property Name */}
						<div>
							<div className="flex items-center gap-4">
								<label className="text-lg font-semibold">Property Name:</label>
								<input
									type="text"
									value={propertyName}
									onChange={(e) => setPropertyName(e.target.value)}
									placeholder="Property Name"
									className="flex-grow p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
									required
								/>
							</div>
							<div className="pl-36">
								<p className="text-sm text-red-600">{propertyNameErrorMsg}</p>
							</div>
						</div>

						{/* Property Price */}
						<div>
							<div className="flex items-center gap-4">
								<label className="text-lg font-semibold" htmlFor="price">
									Price:
								</label>
								<h1 className="text-lg font-semibold">$</h1>
								<input
									type="number"
									placeholder="CAD"
									value={price}
									onChange={handlePriceChange}
									id="price"
									className="flex-grow p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
									required
								/>
								<h1 className="text-lg font-semibold">/month</h1>
							</div>
							<div className="pl-24">
								<p className="text-sm text-red-600">{propertyPriceErrorMsg}</p>
							</div>
						</div>

						{/* Property Location */}
						<div className="flex flex-col gap-4">
							<label htmlFor="address" className="text-lg font-semibold">
								Property Location:
							</label>
							<div className="flex items-center gap-4">
								<label className="text-sm font-semibold">Enter Address</label>
								<p className="text-sm text-red-600">{addressErrorMsg}</p>
							</div>
							<AddressAutocomplete
								onAddressSelect={handleAddressSelect}
								resultLimit={20}
								countryCodes={['ca']}
							/>
							<label className="text-sm font-semibold">Address Line 1</label>
							<input
								type="text"
								value={addressLine1}
								readOnly
								placeholder="Address Line 1"
								className="p-2 border border-gray-400 rounded-lg shadow-lg bg-gray-100"
							/>
							<label className="text-sm font-semibold">City</label>
							<input
								type="text"
								value={city}
								readOnly
								placeholder="City"
								className="p-2 border border-gray-400 rounded-lg shadow-lg bg-gray-100"
							/>
							<label className="text-sm font-semibold">Province</label>
							<input
								type="text"
								value={province}
								readOnly
								placeholder="Province"
								className="p-2 border border-gray-400 rounded-lg shadow-lg bg-gray-100"
							/>

							<label className="text-sm font-semibold">Postal Code</label>
							<input
								type="text"
								value={postalCode}
								onChange={(e) => setPostalCode(e.target.value)}
								placeholder="Postal Code"
								className="p-2 border border-gray-400 rounded-lg shadow-lg bg-white"
							/>
							<label className="text-sm font-semibold">Country</label>
							<input
								type="text"
								value={country}
								readOnly
								placeholder="Country"
								className="p-2 border border-gray-400 rounded-lg shadow-lg bg-gray-100"
							/>

							<input type="hidden" value={latitude} required step="any" />
							<input type="hidden" value={longitude} required step="any" />
						</div>

						{/* Farming Zone */}
						{renderZoneSection()}

						{/* Description */}
						<div className="flex flex-col gap-4">
							<label className="text-lg font-semibold">
								Description(optional):
							</label>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Provide a detailed description of your property"
								rows="3"
								className="p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
							/>
						</div>

						{/* Dimensions Fields */}
						<div className="flex flex-col gap-4">
							<div className="flex items-center gap-4">
								<label className="text-lg font-semibold" htmlFor="dimensions">
									Dimensions:
								</label>
								<p className="text-sm text-red-600">{dimensionErrorMsg}</p>
							</div>
							<div className="flex items-center gap-2">
								<input
									type="number"
									value={length}
									onChange={(e) => setLength(e.target.value)}
									placeholder="Length"
									className="w-1/3 p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
									required
								/>
								<span className="text-lg font-semibold">x</span>
								<input
									type="number"
									value={width}
									onChange={(e) => setWidth(e.target.value)}
									placeholder="Width"
									className="w-1/3 p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
									required
								/>
								<span className="text-lg font-semibold">x</span>
								<input
									type="number"
									value={height}
									onChange={(e) => setHeight(e.target.value)}
									placeholder="Height"
									className="w-1/3 p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
									required
								/>
								<span className="text-lg font-semibold">ft</span>
							</div>
						</div>

						{/* Soil Type */}
						<div>
							<div className="flex items-center gap-4">
								<label className="text-lg font-semibold" htmlFor="soilType">
									Type of Soil:
								</label>
								<select
									id="soilType"
									value={soilType}
									onChange={(e) => setSoilType(e.target.value)}
									className="flex-grow p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
									required
								>
									<option value="" disabled>
										Select soil type
									</option>
									<option value="Loamy">Loamy</option>
									<option value="Clay">Clay</option>
									<option value="Sandy">Sandy</option>
									<option value="Silty">Silty</option>
									<option value="Chalk">Chalk</option>
									<option value="Peat">Peat</option>
								</select>
							</div>
							<div className="pl-28">
								<p className="text-sm text-red-600">{soilTypeErrorMsg}</p>
							</div>
						</div>

						{/* Possible Crops */}
						<div className="flex flex-col gap-4">
							<div className="flex items-center gap-4">
								<label
									className="text-lg font-semibold"
									htmlFor="possibleCrops"
								>
									Possible Crops:
								</label>
								<p className="text-sm text-red-600">{possibleCropsErrorMsg}</p>
							</div>
							<div className="space-y-4">
								<div className="flex items-center gap-4">
									<input
										type="text"
										value={cropInput}
										onChange={(e) => setCropInput(e.target.value)}
										onKeyPress={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												if (cropInput.trim()) {
													setPossibleCrops([
														...possibleCrops,
														cropInput.trim(),
													]);
													setCropInput('');
												}
											}
										}}
										placeholder="e.g. Carrot, Barley, Corn"
										className="flex-grow p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
									/>
									<button
										type="button"
										onClick={() => {
											if (cropInput.trim()) {
												setPossibleCrops([...possibleCrops, cropInput.trim()]);
												setCropInput('');
											}
										}}
										className="px-4 py-2 text-sm text-green-600 hover:text-green-700 focus:outline-none"
									>
										+ Add
									</button>
								</div>
								<div className="flex flex-wrap gap-2">
									{possibleCrops.map((crop, index) => (
										<div
											key={index}
											className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full"
										>
											<span>{crop}</span>
											<button
												type="button"
												onClick={() => {
													setPossibleCrops(
														possibleCrops.filter((_, i) => i !== index)
													);
												}}
												className="text-green-600 hover:text-green-700 focus:outline-none"
											>
												×
											</button>
										</div>
									))}
								</div>
							</div>
						</div>

						{/* Amenities */}
						<div className="flex flex-col gap-4">
							<label className="text-lg font-semibold" htmlFor="amenities">
								Amenities(optional):
							</label>
							<textarea
								value={amenities}
								onChange={(e) => setAmenities(e.target.value)}
								placeholder="e.g. Shed, Electricity, Fencing"
								className="p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
								rows="2"
							/>
						</div>

						<div className="flex flex-col gap-4">
							<label className="text-lg font-semibold" htmlFor="restrictions">
								Restrictions(optional):
							</label>
							<textarea
								id="restrictions"
								value={restrictions}
								onChange={(e) => setRestrictions(e.target.value)}
								placeholder="e.g. No pets, No smoking, No planting marijuana"
								className="p-2 border border-gray-400 rounded-lg shadow-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
								rows="3"
							/>
						</div>

						<h1 className="text-lg font-normal">
							By publishing your listing, you agree to the{' '}
							<strong>Terms, Conditions and Privacy Policy</strong>.
						</h1>
						<LongButton
							buttonName="Publish Listing"
							className="w-full rounded shadow-lg bg-green-500 text-white font-bold"
							type="button" // Change to button type
							onClick={async (e) => {
								e.preventDefault();
								const propertyId = await handleSubmit(e);
								if (propertyId) {
									navigate(`/ListingConfirmation/${propertyId}`);
								}
							}}
						/>
					</form>
					<div className="flex flex-col items-center justify-center w-full mb-20">
						<button
							className="w-1/2  text-red-600 font-bold "
							onClick={openModal}
							type="button" // Change to button type
						>
							Delete Listing
						</button>
						{/* Conditionally render the DeletionModal and pass property_id */}
						{isModalVisible && (
							<DeletionModal property_id={id} onClose={closeModal} />
						)}
					</div>
				</div>
			</div>
			<NavBar ProfileColor="#00B761" SproutPath={Sprout} />
		</div>
	);
};

export default EditProperty;
