/* Campaign data: 6 chapters x 5 missions.
   Mission tuple: [title, description, objectives[], tool, equipment, coins, science points] */
export const FIELD_CAMPAIGNS = {
  1: {
    title: 'First Light — Survival & Science',
    missions: [
      ['Lunar Soil Sample Collection','Scan nearby regolith sites, compare quality, collect labelled samples and return them to the scientist.',['Accept the scientist robot’s briefing','Travel to a marked soil site and scan it','Compare the scan results and select a suitable site','Collect and label the required soil samples','Return to the scientist robot and submit samples'],'Scanner','Collection Tool',180,80],
      ['Temperature Mapping','Measure five locations and create a temperature map around the habitat.',['Accept the temperature survey','Collect and activate the temperature scanner','Record readings at five marked locations','Compare hot, moderate and cold zones','Return and upload the temperature map'],'Scanner','Temperature Sensor',160,90],
      ['Lunar Dust Investigation','Inspect dust-covered equipment and report its effect on performance.',['Accept the dust inspection','Locate affected solar panels and equipment','Scan dust accumulation on five components','Classify equipment condition','Submit the dust impact report'],'Scanner','Cleaning Tool',170,90],
      ['Lunar Mineral Identification','Collect and analyse mineral samples from different lunar locations.',['Accept the mineral survey','Scan five marked mineral locations','Collect and label mineral samples','Analyse samples at the science station','Submit the mineral distribution report'],'Scanner','Collection Tool',200,110],
      ['Solar Radiation Measurement','Map radiation levels and choose a safer rover route.',['Accept the radiation survey','Activate the radiation detector','Record readings at five locations','Mark low, medium and high radiation zones','Submit the radiation map and safe route'],'Scanner','Radiation Detector',190,100]
    ]
  },
  2: { title:'Lunar Exploration', missions:[
    ['Prepare the Rover','Inspect the rover, prepare tools and load equipment.',['Accept rover preparation','Inspect battery, wheels, storage and engine','Collect scanner and sample container','Load equipment into the rover','Confirm rover is ready'],'Repair Tool','Diagnostic Scanner',220,50],
    ['First Drive','Learn rover controls, navigate uneven terrain and return safely.',['Accept the exploration route','Enter the rover','Drive through the marked training checkpoints','Navigate around rocks and craters','Return to the habitat before reserve power runs low'],'Scanner','Rover',240,60],
    ['Lunar Soil Sample Collection','Collect, store and deliver geological samples.',['Accept the sample mission','Drive to a highlighted sample location','Scan the ground and identify suitable soil','Collect and store labelled samples','Deliver samples to the research laboratory'],'Scanner','Collection Tool',300,100],
    ['Temperature Mapping','Survey five locations using a portable temperature sensor.',['Accept the temperature survey','Collect the portable sensor','Place and activate it at marked locations','Record five readings and review the map','Upload the completed survey'],'Temperature Sensor','Scanner',300,100],
    ['Dust and Mineral Investigation','Clean solar panels and investigate nearby lunar materials.',['Accept the investigation','Collect cleaning tool and material scanner','Clean dust from solar panels','Scan and collect mineral samples','Submit observations to the science lab'],'Cleaning Tool','Scanner',350,120]
  ]},
  3: { title:'Power & Energy Independence', missions:[
    ['Audit the Power Network','Inspect generation and consumption and balance the network.',['Accept the power audit','Inspect solar generation','Check habitat and life-support consumption','Operate the distribution controls','Submit the power audit'],'Diagnostic Scanner','Repair Tool',270,60],
    ['Expand Solar Generation','Choose a suitable site and install a new solar array.',['Accept solar expansion','Compare two placement sites','Transport construction materials','Place panels and connect cables','Activate the new solar array'],'Repair Tool','Construction Kit',320,80],
    ['Build Energy Storage','Install battery modules and test backup power.',['Accept battery installation','Inspect battery storage racks','Carry and install battery modules','Connect and activate charging','Test backup power'],'Repair Tool','Battery Module',380,100],
    ['Solar Storm Warning','Prepare the shelter and activate protection before a storm.',['Accept the storm readiness task','Inspect shelter doors and backup power','Collect emergency supplies','Return to the habitat and enter shelter','Close doors and activate protection'],'Repair Tool','Emergency Kit',380,120],
    ['Prepare for Low-Light Operations','Conserve energy while keeping critical systems online.',['Accept low-light preparation','Start the lunar night simulation','Review power consumption','Switch off non-essential systems','Keep life support and heating online until safe'],'Scanner','Power Console',420,120]
  ]},
  4: { title:'Self-Sustaining Lunar Colony', missions:[
    ['Build the Greenhouse','Construct a greenhouse and connect its essential systems.',['Accept greenhouse construction','Select a suitable location','Collect construction materials','Place and assemble the greenhouse','Connect power, water and environmental controls'],'Construction Kit','Repair Tool',300,100],
    ['Start the First Crop','Plant seeds and maintain the hydroponic growing system.',['Accept the crop mission','Collect seeds and nutrients','Plant seeds in growing trays','Activate water and growing lights','Monitor growth and harvest crops'],'Seeds','Watering Tool',320,100],
    ['Water Recycling','Repair the recycler and restore the water supply.',['Accept the water recovery task','Inspect recycler, tanks and pipes','Collect a replacement filter','Replace the filter and reconnect pipes','Run filtration and refill the storage tank'],'Repair Tool','Pipe Kit',350,110],
    ['Oxygen System Experiment','Inspect and repair oxygen distribution equipment.',['Accept the oxygen system check','Inspect tanks and distribution pipes','Locate the damaged connection','Replace the faulty component','Restart and verify oxygen delivery'],'Repair Tool','Pipe Kit',360,120],
    ['Crop Failure Response','Repair greenhouse environmental controls and recover crops.',['Accept the crop recovery task','Inspect crop health and growing trays','Find the lighting or temperature fault','Repair the environmental control unit','Restore settings and harvest surviving plants'],'Repair Tool','Diagnostic Scanner',380,120]
  ]},
  5: { title:'Building the Lunar Settlement', missions:[
    ['Plan the Settlement','Survey terrain and plan safe locations for new habitat modules.',['Accept settlement planning','Survey the surrounding terrain','Mark safe construction locations','Plan connections to existing modules','Submit the settlement layout'],'Scanner','Survey Tool',400,130],
    ['Investigate Lunar Construction Material','Collect and compare local construction material samples.',['Accept material investigation','Locate candidate deposits','Scan material properties','Collect and label samples','Submit material analysis'],'Scanner','Collection Tool',420,140],
    ['Test a Construction Module','Assemble and test a prototype habitat module.',['Accept module test','Collect module components','Assemble the prototype','Inspect seals and connections','Run the module readiness test'],'Construction Kit','Repair Tool',440,150],
    ['Deploy a Robotic Helper','Prepare and activate a robotic assistant.',['Accept robotics deployment','Locate the helper unit','Collect required power and repair parts','Install and activate the unit','Test its assigned maintenance task'],'Repair Tool','Battery Module',460,150],
    ['Connect the New Modules','Connect utilities and verify the expanded settlement.',['Accept module connection task','Inspect power and water connection points','Carry and install connection parts','Connect habitat modules','Run the settlement systems check'],'Repair Tool','Pipe Kit',480,160]
  ]},
  6: { title:'The Final Lunar Mission', missions:[
    ['Rare Resource Investigation','Locate and analyse rare lunar resources.',['Accept the resource investigation','Scan marked resource locations','Collect rare samples','Analyse samples at the science station','Submit the resource report'],'Scanner','Collection Tool',500,170],
    ['Prepare the Supply Inventory','Check and organise supplies for the next mission.',['Accept inventory preparation','Inspect food, water and oxygen reserves','Check tools and spare parts','Load and organise the rover cargo','Submit the inventory checklist'],'Scanner','Inventory Kit',520,170],
    ['Final Survival Simulation','Test habitat readiness through a simulated emergency.',['Accept survival simulation','Inspect life-support and backup systems','Prepare emergency supplies','Activate the simulation and respond to alerts','Complete the readiness report'],'Repair Tool','Emergency Kit',550,180],
    ['Prepare for a Future Mars Mission','Review technologies and prepare long-duration systems.',['Accept Mars preparation task','Inspect power and life-support upgrades','Review research and navigation systems','Prepare long-duration supply modules','Submit mission readiness results'],'Scanner','Diagnostic Scanner',580,190],
    ['Final Mission Review','Complete the final crew and habitat safety checklist.',['Accept final safety check','Inspect crew food, water and oxygen supplies','Verify life-support and habitat safety','Test communications and emergency systems','Submit the final crew safety report'],'Scanner','Repair Tool',650,220]
  ]}
};


// A distinct optional side activity for every campaign mission (6 chapters × 5 missions).
// These are displayed from the live mission-runner selection, so the briefing changes with the mission.
export const SIDE_QUESTS = {
  1: [
    { title: 'Map the Shadowed Crater', description: 'Survey a nearby permanently shadowed crater and mark three safe observation points.', objectives: ['Reach the crater rim', 'Scan three shadowed sectors', 'Tag a safe observation point'], reward: { coins: 90, science: 35 }, icon: '🌑' },
    { title: 'Find the Warmest Worksite', description: 'Compare surface temperatures and identify a safer place for outdoor repairs.', objectives: ['Deploy the thermal probe', 'Record three surface readings', 'Report the warmest worksite'], reward: { coins: 85, science: 40 }, icon: '🌡️' },
    { title: 'Clear the Dusty Antenna', description: 'Inspect a communications antenna and remove the dust reducing its signal.', objectives: ['Locate the antenna mast', 'Scan the dust layer', 'Clean and test the antenna'], reward: { coins: 100, science: 35 }, icon: '📡' },
    { title: 'Trace a Mineral Vein', description: 'Follow a visible mineral trail and collect a small set of comparison readings.', objectives: ['Find the mineral outcrop', 'Scan two exposed layers', 'Upload the mineral comparison'], reward: { coins: 110, science: 50 }, icon: '🪨' },
    { title: 'Mark a Radiation Safe Zone', description: 'Identify a low-radiation route between the habitat and the science station.', objectives: ['Activate the radiation meter', 'Measure three route points', 'Mark the safest path'], reward: { coins: 95, science: 45 }, icon: '☢️' },
  ],
  2: [
    { title: 'Rover Wheel Alignment', description: 'Inspect the rover tracks and recalibrate its wheel alignment before a long drive.', objectives: ['Reach the rover service point', 'Inspect all wheel indicators', 'Run an alignment test'], reward: { coins: 120, science: 30 }, icon: '🛞' },
    { title: 'Beacon-to-Beacon Navigation', description: 'Navigate between three temporary beacons without crossing a crater field.', objectives: ['Activate the first beacon', 'Drive through the second checkpoint', 'Return the route data'], reward: { coins: 130, science: 40 }, icon: '🧭' },
    { title: 'Recover the Lost Sample Case', description: 'Locate a sample container left beside a rocky outcrop and bring it back intact.', objectives: ['Drive to the marked outcrop', 'Scan the surrounding rocks', 'Recover the sample case'], reward: { coins: 150, science: 55 }, icon: '🧰' },
    { title: 'Build a Rover Temperature Log', description: 'Test how the rover behaves across sunlit and shaded terrain.', objectives: ['Place the first temperature sensor', 'Record a shaded reading', 'Compare both readings at base'], reward: { coins: 140, science: 60 }, icon: '🌡️' },
    { title: 'Photograph the Ridge', description: 'Capture a set of geological observations from a high ridge overlooking the outpost.', objectives: ['Reach the ridge viewpoint', 'Capture three terrain observations', 'Submit the ridge survey'], reward: { coins: 160, science: 65 }, icon: '📷' },
  ],
  3: [
    { title: 'Inspect the Backup Bus', description: 'Trace the emergency power bus and identify a safe backup connection.', objectives: ['Reach the power distribution unit', 'Check the backup indicators', 'Confirm the standby connection'], reward: { coins: 130, science: 45 }, icon: '🔌' },
    { title: 'Find a Better Solar Angle', description: 'Survey two nearby slopes and identify the best orientation for an extra solar array.', objectives: ['Survey the eastern slope', 'Survey the western slope', 'Recommend the best panel angle'], reward: { coins: 150, science: 55 }, icon: '☀️' },
    { title: 'Battery Health Check', description: 'Inspect a storage module and run a controlled charge and discharge check.', objectives: ['Inspect the battery rack', 'Start the diagnostic cycle', 'Record the battery health result'], reward: { coins: 170, science: 60 }, icon: '🔋' },
    { title: 'Storm Shelter Drill', description: 'Complete a short emergency drill and verify the shelter supplies are ready.', objectives: ['Collect the emergency checklist', 'Inspect the shelter seal', 'Confirm the crew is accounted for'], reward: { coins: 180, science: 70 }, icon: '🛡️' },
    { title: 'Night Power Audit', description: 'Identify non-essential equipment that can be safely switched off during lunar night.', objectives: ['Inspect the night-load panel', 'Identify two optional loads', 'Submit a power-saving plan'], reward: { coins: 160, science: 75 }, icon: '🌘' },
  ],
  4: [
    { title: 'Pollinate the Test Crop', description: 'Check the greenhouse test trays and help the growth experiment reach its next stage.', objectives: ['Inspect the seed trays', 'Check the growth lamps', 'Log the crop condition'], reward: { coins: 140, science: 60 }, icon: '🌱' },
    { title: 'Find the Water Leak', description: 'Trace a small water loss through the recycler pipes and isolate the faulty joint.', objectives: ['Inspect the recycler inlet', 'Scan the pipe joints', 'Mark the leaking connection'], reward: { coins: 160, science: 70 }, icon: '💧' },
    { title: 'Harvest a Nutrient Sample', description: 'Collect a nutrient solution sample and deliver it to the biology bench.', objectives: ['Prepare a sterile vial', 'Collect the solution sample', 'Deliver it to the lab'], reward: { coins: 170, science: 80 }, icon: '🧪' },
    { title: 'Tune the Greenhouse Lights', description: 'Balance lighting and energy use for the greenhouse during a low-power period.', objectives: ['Inspect the light array', 'Adjust the growth-light setting', 'Verify the energy draw'], reward: { coins: 180, science: 85 }, icon: '💡' },
    { title: 'Close the Recycling Loop', description: 'Verify that water recovery and plant nutrient reuse are working together.', objectives: ['Check recovered water', 'Inspect nutrient storage', 'Submit the closed-loop report'], reward: { coins: 200, science: 95 }, icon: '♻️' },
  ],
  5: [
    { title: 'Choose the Next Habitat Site', description: 'Survey a level construction area with good access to power and communications.', objectives: ['Inspect the northern pad', 'Check the southern pad', 'Recommend a construction site'], reward: { coins: 180, science: 75 }, icon: '🏗️' },
    { title: 'Deliver Structural Beams', description: 'Move a set of construction beams from the landing zone to the assembly area.', objectives: ['Reach the cargo stack', 'Transport the beam bundle', 'Confirm delivery at the workshop'], reward: { coins: 200, science: 80 }, icon: '📦' },
    { title: 'Calibrate the Robotic Arm', description: 'Run a precision movement test on the outpost construction arm.', objectives: ['Power the robotic arm', 'Complete three calibration points', 'Save the calibration profile'], reward: { coins: 220, science: 90 }, icon: '🦾' },
    { title: 'Inspect the Airlock Network', description: 'Check the seals and pressure indicators across the expanded habitat modules.', objectives: ['Inspect module A airlock', 'Inspect module B airlock', 'Confirm pressure integrity'], reward: { coins: 210, science: 95 }, icon: '🚪' },
    { title: 'Survey the Landing Corridor', description: 'Mark a clear approach corridor for future cargo and crew landers.', objectives: ['Inspect the landing pad', 'Identify surface hazards', 'Upload the corridor map'], reward: { coins: 240, science: 105 }, icon: '🚀' },
  ],
  6: [
    { title: 'Deep-Space Communications Test', description: 'Verify the long-range antenna and confirm a stable link with mission control.', objectives: ['Reach the communications mast', 'Align the high-gain antenna', 'Confirm the signal test'], reward: { coins: 220, science: 100 }, icon: '📡' },
    { title: 'Long-Duration Supply Check', description: 'Audit food, water and spare equipment for an extended expedition.', objectives: ['Inspect food storage', 'Check water reserves', 'Submit the supply manifest'], reward: { coins: 240, science: 110 }, icon: '🧳' },
    { title: 'Test the Dust-Sealed Rover', description: 'Inspect seals and run a short mobility test on the upgraded rover.', objectives: ['Check the wheel seals', 'Drive across the rocky patch', 'Report rover readiness'], reward: { coins: 260, science: 120 }, icon: '🚙' },
    { title: 'Run the Crew Readiness Drill', description: 'Complete a final crew safety and emergency-response readiness check.', objectives: ['Inspect crew suits', 'Verify emergency oxygen', 'Complete the response checklist'], reward: { coins: 250, science: 125 }, icon: '👩‍🚀' },
    { title: 'Prepare the Departure Window', description: 'Check the launch area, navigation beacon and final mission telemetry before departure.', objectives: ['Inspect the departure pad', 'Verify navigation beacons', 'Submit the departure readiness report'], reward: { coins: 300, science: 150 }, icon: '🌌' },
  ],
};
