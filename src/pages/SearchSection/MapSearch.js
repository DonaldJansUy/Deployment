import React, { useState, useEffect, useRef } from 'react'; // Import necessary React hooks and components
import { GoogleMap, useLoadScript, Circle, Autocomplete, Marker } from '@react-google-maps/api'; // Import Google Maps components from the library
import { useNavigate } from 'react-router-dom'; // Import useNavigate for navigation between pages
import { motion } from 'framer-motion'; // Import framer-motion for animations
import InAppLogo from '../../components/Logo/inAppLogo'; // Import custom logo component
import NavBar from '../../components/Navbar/navbar'; // Import custom navigation bar component
import Sprout from '../../assets/navbarAssets/sprout.png'; // Import image asset for the navigation bar
import SearchResult from '../../components/SearchComponents/searchResult'; // Import search result component
import { FaMapMarkerAlt } from 'react-icons/fa'; // Import icons for recenter button and markers

// Define the libraries required for Google Maps (places API for autocomplete)
const libraries = ['places'];

// Define the style for the map container
const mapContainerStyle = {
  width: '100%', // Full width of the container
  height: '100%', // Full height of the container
  position: 'relative', // Relative position for the container
  border: '5px solid white', // White border around the map
  borderRadius: '15px', // Rounded corners for the map
};

// Wrapper style for map container, with dynamic height
const mapWrapperStyle = (mapHeight) => ({
  width: '100%', // Full width of the wrapper
  height: mapHeight, // Dynamic height based on state
  position: 'relative', // Relative position for map wrapper
  transition: 'height 0.3s ease-in-out', // Smooth height transition
});

// Default location for the map (Calgary, Alberta)
const defaultCenter = {
  lat: 51.0447, // Latitude of Calgary
  lng: -114.0719, // Longitude of Calgary
};

// Style for the map handle that allows expanding/collapsing
const handleStyle = {
  position: 'absolute', // Position absolute to overlay on the map
  bottom: '10px', // Positioned near the bottom
  left: '50%', // Horizontally centered
  transform: 'translateX(-50%)', // Center align the handle
  width: '60px', // Width of the handle
  height: '10px', // Height of the handle
  backgroundColor: '#ccc', // Light grey color for handle
  borderRadius: '5px', // Rounded corners for the handle
  cursor: 'pointer', // Pointer cursor to indicate interactivity
  zIndex: 1000, // High z-index to ensure it's above other elements
};

// Custom hook to fetch search results from the backend
const useFetchSearchResults = () => {
  const [loading, setLoading] = useState(true); // Loading state for fetching data
  const [error, setError] = useState(null); // Error state for handling errors
  const [data, setData] = useState([]); // Data state for storing search results

  // useEffect to fetch search results when component mounts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Set loading to true while fetching
      setError(null); // Reset any previous errors
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/getSearchResults`); // Fetch data from API
        if (!response.ok) {
          throw new Error('Failed to fetch search results'); // Throw an error if the response is not okay
        }
        const resultData = await response.json(); // Parse the response data
        setData(resultData); // Set the fetched data to state
      } catch (error) {
        setError(error.message); // Set the error message if fetch fails
      } finally {
        setLoading(false); // Set loading to false once fetching is complete
      }
    };
    fetchData(); // Call the fetch function
  }, []); // Empty dependency array means this runs once when mounted

  return { loading, error, data }; // Return loading, error, and data states
};

// Main functional component for the map search page
export default function MapSearch() {
  const [userLocation, setUserLocation] = useState(null); // State for storing user's current location
  const [selectedPlace, setSelectedPlace] = useState(null); // State for storing the selected place from search
  const [mapHeight, setMapHeight] = useState('40vh'); // State for controlling the height of the map
  const mapRef = useRef(null); // Ref to access Google Map instance
  const [isExpanded, setIsExpanded] = useState(false); // State to track if the map is expanded or not
  const autocompleteRef = useRef(null); // Ref to access autocomplete instance

  // Load Google Maps script and handle errors if any
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY, // API key for Google Maps
    libraries: libraries, // Load required libraries (places)
  });

  const navigate = useNavigate(); // Hook for navigation
  const { loading, error, data: searchResults } = useFetchSearchResults(); // Fetch search results using custom hook

  // useEffect to get user's location using browser geolocation
  useEffect(() => {
    const fetchUserLocation = async () => {
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          
          const location = {
            lat: position.coords.latitude, // Get latitude from geolocation
            lng: position.coords.longitude, // Get longitude from geolocation
          };
          setUserLocation(location); // Set user's location to state
        } catch (geoError) {
          console.error('Geolocation failed:', geoError); // Log error if geolocation fails
        }
      }
    };
  
    fetchUserLocation(); // Call the async function to fetch user's location
  }, []); // Empty dependency array means this runs once when mounted
  
   
  
  // Function to toggle map expansion/collapse
  const toggleMapExpansion = () => {
    const newMapHeight = isExpanded ? '40vh' : '85vh'; // Determine new height based on current state
    setMapHeight(newMapHeight); // Set new height for map
    setIsExpanded(!isExpanded); // Toggle expanded state
  };

  // Function to handle place selection from autocomplete
  const handlePlaceSelect = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace(); // Get selected place from autocomplete
      if (place && place.geometry) {
        const location = {
          lat: place.geometry.location.lat(), // Get latitude of selected place
          lng: place.geometry.location.lng(), // Get longitude of selected place
       };
       // setUserLocation(location); // Update user's location
        mapRef.current.panTo(location); // Pan map to new location
        mapRef.current.setZoom(15); // Zoom in on the selected place

        // Find a matching place in search results by comparing names
        const matchedPlace = searchResults.find(
          (result) => result.property_name.toLowerCase() === place.name.toLowerCase()
        );

        if (matchedPlace) {
          setSelectedPlace(matchedPlace); // Set matched place as selected place
          toggleMapExpansion(); // Expand map
        }
      }
    }
  };

  // Function to handle marker click event
  const handleMarkerClick = (result) => {
    setSelectedPlace(result); // Set the clicked marker as selected place
    if (isExpanded) {
      toggleMapExpansion(); // Collapse map if already expanded
    }
  };

  // Function to handle property click event
  const handlePropertyClick = (propertyId) => {
    navigate(`/ViewProperty/${propertyId}`); // Navigate to the property details page
  };

  // Function to recenter map to user's current location
  const handleRecenter = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.panTo(userLocation); // Pan map to user's current location
      mapRef.current.setZoom(12); // Set zoom level to 12
    }
  };

  // Display error if Google Maps failed to load
  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>; // Display loading message while maps are loading

  return (
    <div className="bg-main-background flex flex-col h-screen"> {/* Main container with background and flex properties */}
      {/* Animated in-app logo at the top of the page */}
      <motion.div
        className="fixed top-0 left-0 w-full bg-main-background z-20 p-2"
        initial={{ opacity: 0, y: -20 }} // Initial state for animation
        animate={{ opacity: 1, y: 0 }} // Final state for animation
        transition={{ duration: 0.5 }} // Duration of the animation
      >
        <InAppLogo /> {/* Display the in-app logo */}
      </motion.div>

      {/* Animated Google Map container */}
      <motion.div
        className="flex-grow flex items-center justify-center"
        style={{ marginTop: '50px' }} // Add margin to avoid overlapping with logo
        initial={{ opacity: 0 }} // Initial state for animation
        animate={{ opacity: 1 }} // Final state for animation
        transition={{ duration: 0.7 }} // Duration of the animation
      >
        <div className="w-full" style={{ position: 'relative' }}> {/* Wrapper for Google Map */}
          <div style={mapWrapperStyle(mapHeight)}> {/* Dynamic wrapper for Google Map */}
            {/* Autocomplete input for searching places */}
            <Autocomplete
              onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)} // Set autocomplete instance to ref
              onPlaceChanged={handlePlaceSelect} // Handle when a place is selected
            >
              <input
                type="text"
                placeholder="Search for a place..." // Placeholder text for input
                style={{
                  boxSizing: 'border-box', // Box sizing to include padding and border
                  border: '1px solid transparent', // Transparent border
                  width: 'calc(100% - 40px)', // Full width minus padding
                  height: '40px', // Height of input
                  padding: '0 12px', // Padding inside input
                  borderRadius: '15px', // Rounded corners for input
                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)', // Shadow effect
                  margin: '10px', // Margin around input
                  fontSize: '16px', // Font size
                  outline: 'none', // Remove default outline
                  textOverflow: 'ellipses', // Handle overflowed text
                  position: 'absolute', // Absolute positioning within map
                  left: '10px', // Positioned near the left
                  top: '10px', // Positioned at the top
                  zIndex: 1000, // High z-index to ensure it's above the map
                }}
                onClick={toggleMapExpansion} // Expand the map when input is clicked
              />
            </Autocomplete>

            {/* Google Map component */}
            <GoogleMap
              mapContainerStyle={mapContainerStyle} // Container styling for Google Map
              zoom={12} // Initial zoom level of the map
              center={userLocation || defaultCenter} // Center map at user's location or default
              onLoad={(map) => (mapRef.current = map)} // Set Google Map instance to ref
            >
              {/* Display user's location marker and circle */}
              {userLocation && (
                <>
                  <Marker
                    position={userLocation} // Position marker at user's location
                    icon={{
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="green">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                        </svg>`
                      ), // Custom SVG icon for user's location marker
                    }}
                  />
                  <Circle
                    center={userLocation} // Center circle at user's location
                    radius={1500} // Radius of the circle in meters
                    options={{
                      strokeColor: '#00B761', // Color of the circle border
                      fillColor: '#00B761', // Fill color of the circle
                      fillOpacity: 0.1, // Opacity of the fill color
                      strokeOpacity: 0.8, // Opacity of the stroke
                      strokeWeight: 2, // Thickness of the stroke
                    }}
                  />
                </>
              )}

              {/* Display markers for search results */}
              {searchResults.map((result, index) => (
                <Marker
                  key={index} // Unique key for each marker
                  position={{
                    lat: result.latitude, // Latitude of search result
                    lng: result.longitude, // Longitude of search result
                  }}
                  icon={{
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40" fill="orange">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                      </svg>`
                    ), // Custom SVG icon for search result marker
                  }}
                  onClick={() => handleMarkerClick(result)} // Handle click on marker
                />
              ))}
            </GoogleMap>

            {/* Button to recenter map to user's location */}
            <button
              onClick={handleRecenter} // Handle click to recenter map
              style={{
                position: 'absolute', // Position button absolutely
                bottom: '60px', // Position near the bottom
                left: '20px', // Position near the left
                width: '50px', // Width of button
                height: '50px', // Height of button
                padding: '0', // Remove padding
                backgroundColor: '#00B761', // Button color
                color: 'white', // Text color
                border: 'none', // Remove border
                borderRadius: '50%', // Make button circular
                cursor: 'pointer', // Pointer cursor for button
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)', // Shadow for button
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out', // Smooth transition
                zIndex: 1000, // High z-index to ensure it's above other elements
                display: 'flex', // Flex container for button
                alignItems: 'center', // Center items vertically
                justifyContent: 'center', // Center items horizontally
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.1)'; // Scale up on hover
                e.target.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4)'; // Increase shadow on hover
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)'; // Reset scale on mouse leave
                e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)'; // Reset shadow on mouse leave
              }}
            >
              <FaMapMarkerAlt size={24} /> {/* Recenter icon using react-icons */}
            </button>

            {/* Handle for expanding/collapsing map */}
            <div style={handleStyle} onClick={toggleMapExpansion}></div>
          </div>
        </div>
      </motion.div>

      {/* Animated container for displaying search results */}
      <motion.div
        className="overflow-y-scroll bg-main-background mt-2 h-[50vh] p-4"
        initial={{ opacity: 0, y: 30 }} // Initial state for animation
        animate={{ opacity: 1, y: 0 }} // Final state for animation
        transition={{ duration: 0.5 }} // Duration of the animation
      >
        <div className="flex flex-col mx-auto px-2 gap-2 max-w-lg"> {/* Container for search results */}
          {loading ? ( // Display loading message if fetching
            <div>Loading search results...</div>
          ) : error ? ( // Display error message if fetch fails
            <div>{error}</div>
          ) : selectedPlace ? ( // Display selected place if available
            <div className="rounded-lg shadow-md">
              <SearchResult
                propertyName={selectedPlace.property_name} // Pass property name
                addressLine1={selectedPlace.address_line1} // Pass address line 1
                city={selectedPlace.city} // Pass city
                province={selectedPlace.province} // Pass province
                rentBasePrice={selectedPlace.rent_base_price} // Pass base price
                first_name={selectedPlace.first_name} // Pass first name of owner
                last_name={selectedPlace.last_name} // Pass last name of owner
                propertyCrop={selectedPlace.crop} // Pass type of crop
                dimensionLength={selectedPlace.dimensions_length} // Pass property length
                dimensionWidth={selectedPlace.dimensions_width} // Pass property width
                dimensionHeight={selectedPlace.dimensions_height} // Pass property height
                soilType={selectedPlace.soil_type} // Pass type of soil
                imageUrl={selectedPlace.image_url} // Pass image URL
                growthZone={selectedPlace.growth_zone} // Pass growth zone
                propertyImage={selectedPlace.propertyImage} // Pass property image
                onClick={() => handlePropertyClick(selectedPlace.property_id)} // Handle click on result
              />
            </div>
          ) : (
            searchResults.map((result, index) => ( // Map through search results to display
              <div key={index} className="rounded-lg shadow-md">
                <SearchResult
                  propertyName={result.property_name} // Pass property name
                  addressLine1={result.address_line1} // Pass address line 1
                  city={result.city} // Pass city
                  province={result.province} // Pass province
                  rentBasePrice={result.rent_base_price} // Pass base price
                  first_name={result.first_name} // Pass first name of owner
                  last_name={result.last_name} // Pass last name of owner
                  growthZone={result.growth_zone} // Pass growth zone
                  propertyImage={result.propertyImage} // Pass property image
                  propertyCrop={result.crop} // Pass type of crop
                  dimensionLength={result.dimensions_length} // Pass property length
                  dimensionWidth={result.dimensions_width} // Pass property width
                  dimensionHeight={result.dimensions_height} // Pass property height
                  soilType={result.soil_type} // Pass type of soil
                  onClick={() => handlePropertyClick(result.property_id)} // Handle click on result
                />
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Navigation bar at the bottom of the page */}
      <NavBar EarthColor="#00B761" SproutPath={Sprout} /> {/* Pass props for custom colors and images */}
    </div>
  );
}
