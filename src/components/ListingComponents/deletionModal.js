/**
 * deletionModal.js
 * Description: Modal component for deletion confirmation of a listing.
 * Author: Lilian Huh
 * Date: 2024-10-23
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';


const DeletionModal = ({ property_id, onClose }) => {
	const navigate = useNavigate();

	// Function to handle the deletion of a listing
	const handleDeleteListing = async () => {
		try {
			// Send a POST request to update the status of the property to "0" (deleted)
			const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/updatePropStatus`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					property_id: property_id, // Pass the dynamic property ID
					status: '0',
				}),
			});

			// If the request is successful, log a success message and navigate to the confirmation page
			if (response.ok) {
				console.log('Property has been deleted');
				navigate('/DeletionConfirmation');
			} else {
				console.log('Property could not be deleted');
			}
		} catch (error) {
			console.error('Error deleting property:', error);
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
