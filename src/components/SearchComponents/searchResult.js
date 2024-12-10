/**
 * SearchResult.js
 * Description: Component that displays the search results of the user's search query and recommended properties
 * Frontend Author: Shelyn Del Mundo
 * Backend Author: Shelyn Del Mundo
 * Date: 2024-10-23
 */

import React, {useState} from "react";
import PlantIcon from "../../assets/listingAssets/Plant-icon.png";
import FarmAreaIcon from "../../assets/listingAssets/FarmArea-icon.png";
import SoilIcon from "../../assets/listingAssets/Soil-icon.png";
import ZoneColor from "../ZoneColor/zoneColor";


export default function SearchResult({propertyName, addressLine1, city, province, rentBasePrice, first_name, last_name, growthZone, propertyImage ,propertyCrop, dimensionLength, dimensionWidth, dimensionHeight, soilType, onClick}) {
    const [isClicked, setIsClicked] = useState(false);

    const handleButtonClick = () => {
        setIsClicked((prevState) => !prevState);
    }
    return (
        <div className="w-full sm:w-3/4 md:w-2/3 lg:w-1/2 xl:w-1/3 rounded-lg border-2 py-1 border-gray-200 bg-main-background" onClick={onClick}>
            <div className="px-6 pt-2">
                <div className="flex flex-row justify-between mb-2">
                    <div>
                        <h1 className="font-bold text-lg ">{propertyName}</h1>
                        <p className="text-gray-700 text-sm">{addressLine1} {city} {province}</p>
                        <p className="text-gray-700 font-bold">{rentBasePrice}/month CAD</p>
                    </div>

                    {/* View button to view the respective property */}
                    <div>
                        <button
                            onClick={handleButtonClick}
                            className={`font-bold text-lg ml-2 transition-colors duration-300 ${
                                isClicked ? 'text-green-900' : 'text-green-500'
                            }`}
                            >
                            View
                        </button>                    
                    </div>
                </div>
                <div className="flex flex-row justify-between">
                    <div>
                        <p className="text-xs text-gray-500">Listed by {first_name} {last_name}</p> 
                    </div>
                    <div className="flex flex-row gap-1">
                        <div className="w-4 h-4 border-1 border-gray-400" style={{ backgroundColor: ZoneColor(growthZone) }}></div>
                        <p className="text-xs text-gray-500">Zone {growthZone}</p>
                    </div>
                </div>
            </div>

            <div className="w-auto h-52 flex justify-center items-center mx-4 p-1">
                <img className="w-full h-full rounded-lg border-2 border-gray-200" src={propertyImage} alt={propertyImage} />
            </div>

            <div className="px-4 py-2 flex gap-2 items-center justify-center">
                <div className="flex items-center gap-1 w-1/3 rounded-xl border-2 shadow-md p-2 border-gray-200">
                    <img src={PlantIcon} alt="plant icon" className="w-7 h-7" />
                    <div>
                        <h1 className="text-[10px] text-gray-400">Crop</h1>
                        <p className="text-[10px] text-gray-700">{propertyCrop}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 w-1/3 rounded-xl border-2 shadow-md p-2 border-gray-200">
                    <img src={FarmAreaIcon} alt="farm area icon" className="w-7 h-7" />
                    <div>
                        <h1 className="text-[10px] text-gray-400">Farm Area</h1>
                        <p className="text-[9px] text-gray-700">{dimensionLength}x{dimensionWidth}x{dimensionHeight} ft</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 w-1/3 rounded-xl border-2 shadow-md p-2 border-gray-200">
                    <img src={SoilIcon} alt="soil icon" className="w-7 h-7" />
                    <div>
                        <h1 className="text-[10px] text-gray-400">Soil Type</h1>
                        <p className="text-[10px] text-gray-700">{soilType}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}