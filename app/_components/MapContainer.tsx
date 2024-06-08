"use client";

import { useEffect, useState, useContext } from "react";
import Map from "react-map-gl/maplibre";
import { Pin } from "../_utils/global";
import MarkerContainer from "./MarkerContainer";
import MapContextProvider from "./MapContextProvider";
import MapControls from "./MapControls";
// import TagFilterDropdown from "./TagFilterDropdown";
// import DistanceHintButton from "./DistanceHintButton";
import HintButton from "./HintButton";
import PoiPhotoToggle from "./PoiPhotoToggle";
import { AuthContext } from "./useContext/AuthContext";
import { getAuthService } from "@/config/firebaseconfig";
import GameControls from "./GameControls";
import { ConvertGeolocationPositionToCoordinates, Coordinates,
  GetDistanceFromCoordinatesToMeters,
} from "../_utils/coordinateMath";
import useGeolocation from "../_hooks/useGeolocation";
import FilterButton from "./FilterButton";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

function MapInner() {
  // USE STATE
  const [poiData, setPoiData] = useState<Pin[]>([]);
  const [showPopup, setShowPopup] = useState<number | undefined>(undefined);
  // const [filteredPins, setFilteredPins] = useState(sample.pin);
  const [selectedPoiId, setSelectedPoiId] = useState<number | undefined>(
    undefined
  );
  const [filters, setFilters] = useState<string[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[] | void[]>([]);

  const [userCoordinates, setUserCoordinates] = useState<Coordinates|null>(null);
  const [closestNotCompletedPin, setClosestNotCompletedPin] = useState<Pin|null> (null);
  const [distanceToTrackingPin, setDistanceToTrackingPin] = useState<number|null> (null);
  // const [isTrackingTheClosestPin, setIsTrackingTheClosestPin] = useState<boolean> (true);

  // Default camera map when user opens the app
  const longitude: number = 139.72953967417234;
  const latitude: number = 35.66060121205606;
  const [viewPort, setViewPort] = useState({
    longitude: longitude,
    latitude: latitude,
    zoom: 14,
  });

  const user = useContext(AuthContext);
  // USE EFFECT
  useEffect(() => {
    user ? void handleFetchPoiByUid() : void handleFetchPoiByAnonymous();
    void handleFetchFilters();
  }, [user]);

  useEffect(() => {
    if(!closestNotCompletedPin) return;
    console.log("closest pin: ", closestNotCompletedPin);
    if (userCoordinates) {
      handleDistanceToClosestPin(userCoordinates, closestNotCompletedPin);
    }
  }, [closestNotCompletedPin])
  
  useEffect(()=> {
    console.log("Distance to tracking pin", distanceToTrackingPin);
  },[distanceToTrackingPin])

  // HANDLER FUNCTION
  const handleFetchPoiByUid = async () => {
    try {
      const auth = await getAuthService();
      if (!auth.currentUser) throw "No current user";
      const uid: string = auth.currentUser.uid;

      const response = await fetch(`${BASE_URL}/api/poi/status`, {
        credentials: "include",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: uid }),
      });
      const data: Pin[] = (await response.json()) as Pin[];
      setPoiData(data);
    } catch (error) {
      console.log(error);
      setPoiData([]);
    }
  };

  const handleFetchPoiByAnonymous = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/poi/`, {
      credentials: "include",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data: Pin[] = (await response.json()) as Pin[];
      setPoiData(data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleFetchFilters = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/tag`);
      const data: string[] = (await response.json()) as string[];
      setFilters(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDistanceToClosestPin = (userCoordinates: Coordinates, pin: Pin) => {
    const pinCoordinates: Coordinates = {
      longitude: pin.search_longitude,
      latitude: pin.search_latitude,
    }
    const distance = GetDistanceFromCoordinatesToMeters(userCoordinates, pinCoordinates);
    console.log("Calculate distance", distance );
    setDistanceToTrackingPin(distance);
  }
    
  /**
  * Sets the user's coordinates
  * @param position 
  */
  const handleSetUserCoordinates = (position: GeolocationPosition) => {
    const userCoord:Coordinates = ConvertGeolocationPositionToCoordinates(position);
    setUserCoordinates(userCoord);
  }
     
  /**
  * Sets closestNotCompletedPin to the closes pin BY POSITION
  * Currently does not account for filters
  * @param position 
  */
  const handleSetClosestNotCompletedPin = (position: GeolocationPosition) => {
    const userCoordinates: Coordinates = {
      longitude: position.coords.longitude,
      latitude: position.coords.latitude,
    };
  
    let shortestDistance: number = Number.MAX_SAFE_INTEGER;
    let closestPin: Pin | null = null;
  
    for (const pin of poiData) {
      if (pin.is_completed) continue;
   
      const pinCoordinates: Coordinates = {
        longitude: pin.exact_longitude,
        latitude: pin.exact_latitude,
      };
    
      const distance: number = GetDistanceFromCoordinatesToMeters(userCoordinates, pinCoordinates);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        closestPin = pin;
      }
    }
    setClosestNotCompletedPin(closestPin);
  }
     
  useGeolocation(handleSetUserCoordinates);
  useGeolocation(handleSetClosestNotCompletedPin);

  // const handleFilter = (selectedTags: string[]) => {
  //   if (selectedTags.length === 0) {
  //     setFilteredPins(sample.pin);
  //   } else {
  //     const filtered = sample.pin.filter((pin) =>
  //       selectedTags.every((tag) => pin.tags.includes(tag))
  //     );
  //     setFilteredPins(filtered);
  //   }
  // };


  // RETURN
  return (
    <div className="relative overflow-hidden inset-0 bg-mapBg">
      {/* THIS SHOULD BE MOVED TO OTHER PLACE */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        {/* <TagFilterDropdown onFilter={handleFilter} /> */}
        <HintButton poi_id={selectedPoiId} />
        <GameControls 
        pins = {poiData} 
        trackingPin={closestNotCompletedPin} 
        userCoordinates={userCoordinates} 
        distanceToTrackingPin={distanceToTrackingPin}/>
        <PoiPhotoToggle pins={poiData} /> {/* Integrate the new component */}
        <FilterButton
          filters={filters}
          setSelectedFilters={setSelectedFilters}
        />
        <li>
          {selectedFilters.length > 0
            ? `Filtered by ${selectedFilters.join(", ")}`
            : "All"}
        </li>
      </div>
      {/* MAP CANVAS */}
      <Map
        {...viewPort}
        onMove={(evt) => setViewPort(evt.viewState)}
        style={{ width: "100vw", height: "100vh" }}
        reuseMaps
        dragRotate={false}
        mapStyle={`https://api.protomaps.com/styles/v2/light.json?key=${process.env.NEXT_PUBLIC_PROTOMAPS_API_KEY}`}
      >
        {/* FOR V1 DEVELOPMENT */}
        {poiData.map((pin: Pin): JSX.Element => {
            return (
              <MarkerContainer
                key={pin.poi_id}
                pin={pin}
                showPopup={showPopup}
                setShowPopup={setShowPopup}
                setSelectedPoiId={setSelectedPoiId}
              />
            );
          })}

        {/* V0 DEVELOPMENT w/ FILTER FEATURE */}
        {/* {sample.map((pin: Pin): JSX.Element => {
          return (
            <MarkerContainer
              key={pin.id}
              pin={pin}
              showPopup={showPopup}
              setShowPopup={setShowPopup}
              setSelectedPoiId={setSelectedPoiId}
            />
          );
        })} */}

        {/* {filteredPins.map((pin: Pin): JSX.Element => {
          return (
            <MarkerContainer
              key={pin.id}
              pin={pin}
              showPopup={showPopup}
              setShowPopup={setShowPopup}
              setSelectedPoiId={setSelectedPoiId}
            />
          );
        })} */}
        {/* <DistanceHintButton pins={poiData} /> */}
        {/* <SubmitGuessButton pins={poiData} /> */}

        <MapControls />
      </Map>

    </div>
  );
}

const MapContainer = () => (
  <MapContextProvider>
    <MapInner />
  </MapContextProvider>
);

export default MapContainer;
