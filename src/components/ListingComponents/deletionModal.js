/**
 * deletionModal.js
 * Description: Modal component for deletion confirmation of a listing.
 * Author: Lilian Huh
 * Date: 2024-10-23
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../../_utils/firebase';

const DeletionModal = ({ property_id, onClose }) => {
	const navigate = useNavigate();

	// Function to delete images from Firebase storage
	const deleteImagesFromStorage = async (imageUrls) => {
		try {
			const deletionPromises = imageUrls.map(async (imageUrl) => {
				try {
					const imageRef = ref(storage, imageUrl);
					await deleteObject(imageRef);
					console.log(`Deleted image: ${imageUrl}`);
				} catch (error) {
					console.error(`Error deleting image ${imageUrl}:`, error);
				}
			});

			await Promise.all(deletionPromises);
		} catch (error) {
			console.error('Error deleting images:', error);
			throw error;
		}
	};

	// Function to handle the deletion of a listing
	const handleDeleteListing = async () => {
		try {
			// First, fetch the property details to get image URLs
			const detailsResponse = await fetch(
				`${process.env.REACT_APP_BACKEND_URL}/api/getPropertyDetails?property_id=${property_id}`,
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);

			if (!detailsResponse.ok) {
				throw new Error('Failed to fetch property details');
			}

			const propertyData = await detailsResponse.json();
			
			// Collect all image URLs
			const allImageUrls = [
				...(propertyData.primaryImage ? [propertyData.primaryImage] : []),
				...(propertyData.otherImages || [])
			];

			// Delete images from Firebase storage
			await deleteImagesFromStorage(allImageUrls);

			// Send a POST request to update the status of the property to "0" (deleted)
			const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/updatePropStatus`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					property_id: property_id,
					status: '0',
				}),
			});

			// If the request is successful, navigate to the confirmation page
			if (response.ok) {
				console.log('Property has been deleted');
				navigate('/DeletionConfirmation');
			} else {
				console.log('Property could not be deleted');
				throw new Error('Failed to update property status');
			}
		} catch (error) {
			console.error('Error deleting property:', error);
			// Optionally, show an error message to the user
			alert('Failed to delete listing. Please try again.');
		}
	};

	return (
		<div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
			<div className="bg-white p-6 rounded-md shadow-lg max-w-sm w-full text-center">
				<p className="text-lg font-semibold">Permanently delete listing?</p>
				<p className="text-sm text-gray-600 mt-2">
					Are you sure you want to permanently delete your listing?
				</p>
				<p className="text-sm text-gray-600 mt-2">This cannot be reversed.</p>
				<div className="flex justify-center space-x-4 mt-6">
					<button
						className="px-8 py-2 bg-white rounded-full border border-black hover:bg-gray-100"
						onClick={onClose}
					>
						No
					</button>

					<button
						onClick={handleDeleteListing}
						className="px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700"
					>
						Delete
					</button>
				</div>
			</div>
		</div>
	);
};

export default DeletionModal;
