export type Article = { id: string; title: string; journal: string; date: string; electronicDate?: string; authors: string; type: string; topic: string; doi?: string; url: string; source?: "SBC" | "SBEM" | "PubMed"; year?: number; language?: string };
export type AbstractSection = { label: string; text: string };
export type BrazilianGuideline = { id: string; title: string; year: number; topic: string; topics?: string[]; kind: string; url: string; scope?: string; authorship?: string };
// Specialty names follow the official CME/CFM list. Search aliases are English
// terms used in PubMed titles/abstracts; they are search aids, not taxonomy claims.
export const medicalSpecialties = [
 ["acupuncture", "Acupuntura", "acupuncture"],
 ["allergy-immunology", "Alergia e Imunologia", "allergy;allergology;immunology"],
 ["anesthesiology", "Anestesiologia", "anesthesiology;anesthesia"],
 ["angiology", "Angiologia", "angiology;vascular medicine"],
 ["cardiology", "Cardiologia", "cardiology;cardiovascular medicine"],
 ["cardiovascular-surgery", "Cirurgia Cardiovascular", "cardiac surgery;cardiovascular surgery"],
 ["hand-surgery", "Cirurgia da Mão", "hand surgery"],
 ["head-neck-surgery", "Cirurgia de Cabeça e Pescoço", "head and neck surgery"],
 ["digestive-surgery", "Cirurgia do Aparelho Digestivo", "digestive system surgical procedures;gastrointestinal surgery"],
 ["general-surgery", "Cirurgia Geral", "general surgery"],
 ["surgical-oncology", "Cirurgia Oncológica", "surgical oncology"],
 ["pediatric-surgery", "Cirurgia Pediátrica", "pediatric surgery"],
 ["plastic-surgery", "Cirurgia Plástica", "plastic surgery"],
 ["thoracic-surgery", "Cirurgia Torácica", "thoracic surgery"],
 ["vascular-surgery", "Cirurgia Vascular", "vascular surgery"],
 ["internal-medicine", "Clínica Médica", "internal medicine"],
 ["coloproctology", "Coloproctologia", "coloproctology;colorectal surgery"],
 ["dermatology", "Dermatologia", "dermatology;skin diseases"],
 ["endocrinology", "Endocrinologia e Metabologia", "endocrinology;metabolic diseases"],
 ["endoscopy", "Endoscopia", "endoscopy"],
 ["gastroenterology", "Gastroenterologia", "gastroenterology;digestive system diseases"],
 ["medical-genetics", "Genética Médica", "medical genetics;genetic diseases"],
 ["geriatrics", "Geriatria", "geriatrics;geriatric medicine"],
 ["ob-gyn", "Ginecologia e Obstetrícia", "obstetrics;gynecology"],
 ["hematology", "Hematologia e Hemoterapia", "hematology;hemotherapy"],
 ["homeopathy", "Homeopatia", "homeopathy"],
 ["infectious-disease", "Infectologia", "infectious diseases;infectious disease medicine"],
 ["mastology", "Mastologia", "mastology;breast diseases"],
 ["emergency-medicine", "Medicina de Emergência", "emergency medicine"],
 ["family-medicine", "Medicina de Família e Comunidade", "family medicine;primary health care"],
 ["occupational-medicine", "Medicina do Trabalho", "occupational medicine"],
 ["traffic-medicine", "Medicina do Tráfego", "traffic medicine;transportation medicine"],
 ["sports-medicine", "Medicina Esportiva", "sports medicine"],
 ["physical-rehabilitation", "Medicina Física e Reabilitação", "physical medicine and rehabilitation;rehabilitation medicine"],
 ["critical-care", "Medicina Intensiva", "critical care;intensive care medicine"],
 ["forensic-medicine", "Medicina Legal e Perícia Médica", "forensic medicine;legal medicine"],
 ["nuclear-medicine", "Medicina Nuclear", "nuclear medicine"],
 ["preventive-social-medicine", "Medicina Preventiva e Social", "preventive medicine;public health"],
 ["nephrology", "Nefrologia", "nephrology;kidney diseases"],
 ["neurosurgery", "Neurocirurgia", "neurosurgery"],
 ["neurology", "Neurologia", "neurology;neurologic diseases"],
 ["nutrition", "Nutrologia", "clinical nutrition;nutritional sciences"],
 ["ophthalmology", "Oftalmologia", "ophthalmology;eye diseases"],
 ["medical-oncology", "Oncologia Clínica", "medical oncology;neoplasms"],
 ["orthopedics", "Ortopedia e Traumatologia", "orthopedics;orthopedic surgery;traumatology"],
 ["otolaryngology", "Otorrinolaringologia", "otorhinolaryngology;ear nose throat"],
 ["pathology", "Patologia", "pathology"],
 ["laboratory-medicine", "Patologia Clínica/Medicina Laboratorial", "clinical pathology;laboratory medicine"],
 ["pediatrics", "Pediatria", "pediatrics;pediatric medicine"],
 ["pulmonology", "Pneumologia", "pulmonology;respiratory diseases"],
 ["psychiatry", "Psiquiatria", "psychiatry;mental disorders"],
 ["radiology", "Radiologia e Diagnóstico por Imagem", "radiology;diagnostic imaging"],
 ["radiation-oncology", "Radioterapia", "radiotherapy;radiation oncology"],
 ["rheumatology", "Reumatologia", "rheumatology;rheumatic diseases"],
 ["urology", "Urologia", "urology;urinary tract diseases"],
] as const;
export const generalTopics = [["all", "Todos os temas", ""]] as const;
export const cardiologyTopics = [
 ["all", "Todos os temas", ""],
 ["heart-failure", "Insuficiência cardíaca", '"Heart Failure"[MeSH Terms]'],
 ["cardiogeriatrics", "Cardiologia do idoso", '"Aged"[MeSH Terms]'],
 ["hypertension", "Hipertensão arterial", '("Hypertension"[MeSH Terms] NOT "Hypertension, Pulmonary"[MeSH Terms] NOT "Pulmonary Arterial Hypertension"[MeSH Terms])'],
 ["coronary", "Doença arterial coronariana", '"Coronary Artery Disease"[MeSH Terms]'],
 ["acute-coronary", "Síndrome coronariana aguda e infarto", '"Acute Coronary Syndrome"[MeSH Terms]'],
 ["arrhythmia", "Arritmias", '"Arrhythmias, Cardiac"[MeSH Terms]'],
 ["atrial-fibrillation", "Fibrilação atrial", '"Atrial Fibrillation"[MeSH Terms]'],
 ["prevention", "Dislipidemia e prevenção cardiovascular", '("Dyslipidemias"[MeSH Terms] OR "Primary Prevention"[MeSH Terms] OR ("Atherosclerosis"[MeSH Terms] AND "Primary Prevention"[MeSH Terms]))'],
 ["valvular", "Valvopatias", '"Heart Valve Diseases"[MeSH Terms]'],
 ["cardiomyopathy", "Cardiomiopatias", '"Cardiomyopathies"[MeSH Terms]'],
 ["aortic", "Doenças da aorta", '"Aortic Diseases"[MeSH Terms]'],
 ["peripheral-vascular", "Doença arterial periférica", '"Peripheral Arterial Disease"[MeSH Terms]'],
 ["congenital", "Cardiopatias congênitas", '"Heart Defects, Congenital"[MeSH Terms]'],
 ["pericardial", "Doenças do pericárdio", '("Pericarditis"[MeSH Terms] OR "Pericardial Effusion"[MeSH Terms] OR "Cardiac Tamponade"[MeSH Terms] OR pericardial[Title/Abstract])'],
 ["endocarditis", "Endocardite infecciosa", '"Endocarditis, Bacterial"[MeSH Terms]'],
 ["pulmonary-hypertension", "Hipertensão pulmonar", '"Hypertension, Pulmonary"[MeSH Terms]'],
 ["cardiac-arrest", "Parada cardiorrespiratória", '"Heart Arrest"[MeSH Terms]'],
 ["imaging", "Imagem cardiovascular", '("Echocardiography"[MeSH Terms] OR "Magnetic Resonance Imaging"[MeSH Terms] OR "Tomography, X-Ray Computed"[MeSH Terms])'],
 ["women", "Cardiologia da mulher", '("Women"[MeSH Terms] AND "Cardiovascular Diseases"[MeSH Terms])'],
 ["obesity", "Obesidade e risco cardiometabólico", '"Obesity"[MeSH Terms]'],
 ["anticoagulation", "Anticoagulação e antitrombóticos", '("Anticoagulants"[MeSH Terms] OR "Antithrombins"[MeSH Terms])'],
 ["sports", "Cardiologia do esporte e exercício", '("Sports"[MeSH Terms] OR "Exercise"[MeSH Terms])'],
 ["perioperative", "Avaliação cardiovascular perioperatória", '"Perioperative Care"[MeSH Terms]'],
 ["chagas", "Cardiomiopatia da doença de Chagas", '"Chagas Cardiomyopathy"[MeSH Terms]'],
 ["myocarditis", "Miocardite", '"Myocarditis"[MeSH Terms]'],
 ["venous-thromboembolism", "Tromboembolismo venoso", '"Venous Thromboembolism"[MeSH Terms]'],
 ["carotid", "Doenças das carótidas e vertebrais", '"Carotid Artery Diseases"[MeSH Terms]'],
 ["dyslipidemia", "Dislipidemia", '"Dyslipidemias"[MeSH Terms]']
] as const;
// Temas clínicos organizados pelos departamentos e áreas de atuação da SBEM.
export const endocrinologyTopics = [
 ["all", "Todos os temas", ""],
 ["endo-diabetes", "Diabetes e pré-diabetes", '("Diabetes Mellitus"[MeSH Terms] OR prediabetes[Title/Abstract])'],
 ["endo-obesity", "Obesidade e metabolismo", '("Obesity"[MeSH Terms] OR "Metabolic Syndrome"[MeSH Terms])'],
 ["endo-thyroid", "Tireoide", '("Thyroid Diseases"[MeSH Terms] OR thyroid[Title])'],
 ["endo-adrenal", "Adrenal e hipertensão endócrina", '("Adrenal Gland Diseases"[MeSH Terms] OR "Hyperaldosteronism"[MeSH Terms] OR "Primary Aldosteronism"[Title/Abstract] OR pheochromocytoma[Title/Abstract])'],
 ["endo-pituitary", "Hipófise e neuroendocrinologia", '("Pituitary Diseases"[MeSH Terms] OR hyperprolactinemia[Title] OR acromegaly[Title])'],
 ["endo-bone", "Metabolismo ósseo e mineral", '("Bone Diseases, Metabolic"[MeSH Terms] OR "Osteoporosis"[MeSH Terms] OR "Calcium Metabolism Disorders"[MeSH Terms])'],
 ["endo-reproductive", "Endocrinologia feminina, andrologia e transgeneridade", '("Polycystic Ovary Syndrome"[MeSH Terms] OR "Hypogonadism"[MeSH Terms] OR "Infertility"[MeSH Terms] OR transgender[Title/Abstract])'],
 ["endo-pediatric", "Endocrinologia pediátrica, crescimento e puberdade", '("Pediatric Obesity"[MeSH Terms] OR "Growth Disorders"[MeSH Terms] OR "Puberty, Precocious"[MeSH Terms])'],
 ["endo-lipids", "Dislipidemia e aterosclerose", '("Dyslipidemias"[MeSH Terms] OR "Atherosclerosis"[MeSH Terms])'],
 ["endo-liver", "Fígado metabólico e esteatose (MASLD)", '("Fatty Liver"[MeSH Terms] OR MASLD[Title/Abstract] OR NAFLD[Title/Abstract])'],
 ["endo-exercise", "Endocrinologia do esporte e exercício", '("Exercise"[MeSH Terms] AND ("Endocrine System"[MeSH Terms] OR metabolism[Title/Abstract]))'],
 ["endo-environment", "Endocrinologia ambiental", '("Endocrine Disruptors"[MeSH Terms] OR "Environmental Pollutants"[MeSH Terms])'],
 ["endo-rare", "Doenças endócrinas raras", '("Endocrine System Diseases"[MeSH Terms] AND rare[Title/Abstract])'],
] as const;
type ClinicalTopic = readonly [string, string, string];
const clinicalTopic = (id: string, label: string, mesh: string[], aliases: string[] = []): ClinicalTopic => {
 const query = [...mesh.map((term) => `"${term}"[MeSH Terms]`), ...aliases.map((term) => `"${term}"[Title/Abstract]`)].join(" OR ");
 return [id, label, `(${query})`];
};
// Common themes for specialties not already covered by the focused SBC/SBEM catalogs.
// Each query combines MeSH indexing with title/abstract synonyms to include newer records.
const topicBank = {
 pain: clinicalTopic("med-pain", "Dor crônica e analgesia", ["Chronic Pain", "Analgesics"], ["chronic pain", "pain management"]),
 migraine: clinicalTopic("med-migraine", "Enxaqueca e cefaleia", ["Migraine Disorders", "Headache"], ["migraine", "headache"]),
 asthma: clinicalTopic("med-asthma", "Asma", ["Asthma"], ["asthma"]),
 allergicRhinitis: clinicalTopic("med-allergic-rhinitis", "Rinite alérgica", ["Rhinitis, Allergic"], ["allergic rhinitis"]),
 atopicDermatitis: clinicalTopic("med-atopic-dermatitis", "Dermatite atópica", ["Dermatitis, Atopic"], ["atopic dermatitis", "eczema"]),
 foodAllergy: clinicalTopic("med-food-allergy", "Alergia alimentar", ["Food Hypersensitivity"], ["food allergy"]),
 anaphylaxis: clinicalTopic("med-anaphylaxis", "Anafilaxia", ["Anaphylaxis"], ["anaphylaxis"]),
 urticaria: clinicalTopic("med-urticaria", "Urticária", ["Urticaria"], ["urticaria", "hives"]),
 perioperative: clinicalTopic("med-perioperative", "Cuidados perioperatórios", ["Perioperative Care", "Anesthesia"], ["perioperative care"]),
 airway: clinicalTopic("med-airway", "Via aérea e intubação", ["Airway Management", "Intubation, Intratracheal"], ["airway management", "intubation"]),
  postoperativePain: clinicalTopic("med-postoperative-pain", "Dor pós-operatória", ["Postoperative Pain"], ["postoperative pain"]),
 peripheralArtery: clinicalTopic("med-peripheral-artery", "Doença arterial periférica", ["Peripheral Arterial Disease"], ["peripheral artery disease"]),
 venousThromboembolism: clinicalTopic("med-vte", "Tromboembolismo venoso", ["Venous Thromboembolism", "Pulmonary Embolism", "Venous Thrombosis"], ["venous thromboembolism"]),
 aneurysm: clinicalTopic("med-aneurysm", "Aneurismas arteriais", ["Aneurysm"], ["arterial aneurysm", "aortic aneurysm"]),
 carotid: clinicalTopic("med-carotid", "Doença carotídea", ["Carotid Artery Diseases"], ["carotid artery disease"]),
 coronarySurgery: clinicalTopic("med-coronary-surgery", "Revascularização miocárdica", ["Coronary Artery Bypass", "Myocardial Revascularization"], ["coronary artery bypass"]),
 valveSurgery: clinicalTopic("med-valve-surgery", "Cirurgia de valvas cardíacas", ["Heart Valve Diseases", "Cardiac Surgical Procedures"], ["valve surgery"]),
 congenital: clinicalTopic("med-congenital", "Malformações congênitas", ["Heart Defects, Congenital", "Congenital Abnormalities"], ["congenital heart disease"]),
 carpalTunnel: clinicalTopic("med-carpal-tunnel", "Síndrome do túnel do carpo", ["Carpal Tunnel Syndrome"], ["carpal tunnel syndrome"]),
  handInjuries: clinicalTopic("med-hand-injuries", "Traumas e fraturas da mão", ["Hand Injuries"], ["hand injury", "hand fracture"]),
 headNeckCancer: clinicalTopic("med-head-neck-cancer", "Câncer de cabeça e pescoço", ["Head and Neck Neoplasms"], ["head and neck cancer"]),
 thyroid: clinicalTopic("med-thyroid", "Doenças da tireoide", ["Thyroid Diseases", "Thyroid Neoplasms"], ["thyroid disease", "thyroid cancer"]),
 colorectalCancer: clinicalTopic("med-colorectal-cancer", "Câncer colorretal", ["Colorectal Neoplasms"], ["colorectal cancer"]),
 bariatric: clinicalTopic("med-bariatric", "Cirurgia bariátrica", ["Bariatric Surgery"], ["bariatric surgery"]),
 gallstones: clinicalTopic("med-gallstones", "Colelitíase e doença biliar", ["Cholelithiasis", "Gallbladder Diseases"], ["gallstones"]),
 hernia: clinicalTopic("med-hernia", "Hérnias da parede abdominal", ["Hernia, Abdominal"], ["abdominal hernia"]),
 appendicitis: clinicalTopic("med-appendicitis", "Apendicite", ["Appendicitis"], ["appendicitis"]),
 breastCancer: clinicalTopic("med-breast-cancer", "Câncer de mama", ["Breast Neoplasms"], ["breast cancer"]),
 lungCancer: clinicalTopic("med-lung-cancer", "Câncer de pulmão", ["Lung Neoplasms"], ["lung cancer"]),
  burns: clinicalTopic("med-burns", "Queimaduras e reconstrução", ["Burns", "Plastic Surgery Procedures"], ["burn injury", "reconstructive surgery"]),
 woundHealing: clinicalTopic("med-wound-healing", "Feridas e cicatrização", ["Wound Healing", "Wounds and Injuries"], ["wound healing"]),
 pneumothorax: clinicalTopic("med-pneumothorax", "Pneumotórax e doença pleural", ["Pneumothorax", "Pleural Diseases"], ["pneumothorax"]),
 diabetes: clinicalTopic("med-diabetes", "Diabetes", ["Diabetes Mellitus"], ["diabetes mellitus"]),
 hypertension: clinicalTopic("med-hypertension", "Hipertensão arterial", ["Hypertension"], ["hypertension", "high blood pressure"]),
 pneumonia: clinicalTopic("med-pneumonia", "Pneumonia", ["Pneumonia"], ["pneumonia"]),
 heartFailure: clinicalTopic("med-heart-failure", "Insuficiência cardíaca", ["Heart Failure"], ["heart failure"]),
 kidneyDisease: clinicalTopic("med-kidney-disease", "Doença renal crônica", ["Renal Insufficiency, Chronic"], ["chronic kidney disease", "CKD"]),
 sepsis: clinicalTopic("med-sepsis", "Sepse", ["Sepsis"], ["sepsis"]),
 inflammatoryBowel: clinicalTopic("med-ibd", "Doença inflamatória intestinal", ["Inflammatory Bowel Diseases", "Crohn Disease", "Colitis, Ulcerative"], ["inflammatory bowel disease"]),
 hemorrhoids: clinicalTopic("med-hemorrhoids", "Hemorroidas e doença anal", ["Hemorrhoids"], ["hemorrhoids"]),
  diverticular: clinicalTopic("med-diverticular", "Doença diverticular", ["Diverticular Diseases", "Diverticulitis"], ["diverticular disease"]),
 psoriasis: clinicalTopic("med-psoriasis", "Psoríase", ["Psoriasis"], ["psoriasis"]),
 melanoma: clinicalTopic("med-melanoma", "Melanoma e câncer de pele", ["Melanoma", "Skin Neoplasms"], ["melanoma", "skin cancer"]),
 acne: clinicalTopic("med-acne", "Acne", ["Acne Vulgaris"], ["acne"]),
 gerd: clinicalTopic("med-gerd", "Refluxo gastroesofágico", ["Gastroesophageal Reflux"], ["gastroesophageal reflux"]),
 cirrhosis: clinicalTopic("med-cirrhosis", "Cirrose e doença hepática", ["Liver Cirrhosis", "Liver Diseases"], ["cirrhosis"]),
 irritableBowel: clinicalTopic("med-ibs", "Síndrome do intestino irritável", ["Irritable Bowel Syndrome"], ["irritable bowel syndrome"]),
 fattyLiver: clinicalTopic("med-fatty-liver", "Esteatose hepática metabólica", ["Non-alcoholic Fatty Liver Disease"], ["metabolic dysfunction associated steatotic liver disease", "MASLD", "NAFLD"]),
 rareDisease: clinicalTopic("med-rare-disease", "Doenças raras e genética", ["Rare Diseases", "Genetic Diseases, Inborn"], ["rare disease"]),
 dementia: clinicalTopic("med-dementia", "Demência e doença de Alzheimer", ["Dementia", "Alzheimer Disease"], ["dementia", "Alzheimer disease"]),
 falls: clinicalTopic("med-falls", "Quedas e fragilidade", ["Accidental Falls", "Frailty"], ["falls in older adults", "frailty"]),
 pregnancy: clinicalTopic("med-pregnancy", "Gestação e pré-natal", ["Pregnancy", "Prenatal Care"], ["pregnancy"]),
 preeclampsia: clinicalTopic("med-preeclampsia", "Pré-eclâmpsia", ["Pre-Eclampsia"], ["preeclampsia", "pre-eclampsia"]),
 endometriosis: clinicalTopic("med-endometriosis", "Endometriose", ["Endometriosis"], ["endometriosis"]),
 anemia: clinicalTopic("med-anemia", "Anemias", ["Anemia"], ["anemia"]),
 leukemia: clinicalTopic("med-leukemia", "Leucemias", ["Leukemia"], ["leukemia"]),
 lymphoma: clinicalTopic("med-lymphoma", "Linfomas", ["Lymphoma"], ["lymphoma"]),
 hiv: clinicalTopic("med-hiv", "HIV e AIDS", ["HIV Infections", "Acquired Immunodeficiency Syndrome"], ["HIV infection", "AIDS"]),
 tuberculosis: clinicalTopic("med-tuberculosis", "Tuberculose", ["Tuberculosis"], ["tuberculosis"]),
 dengue: clinicalTopic("med-dengue", "Dengue", ["Dengue"], ["dengue"]),
 antimicrobialResistance: clinicalTopic("med-antimicrobial-resistance", "Resistência antimicrobiana", ["Drug Resistance, Microbial"], ["antimicrobial resistance"]),
 trauma: clinicalTopic("med-trauma", "Trauma e lesões", ["Wounds and Injuries", "Multiple Trauma"], ["trauma", "injury"]),
 stroke: clinicalTopic("med-stroke", "Acidente vascular cerebral", ["Stroke"], ["stroke", "cerebrovascular accident"]),
 vaccination: clinicalTopic("med-vaccine", "Vacinação e imunização", ["Vaccination", "Immunization"], ["vaccination", "immunization"]),
 depression: clinicalTopic("med-depression", "Depressão", ["Depressive Disorder"], ["depression", "depressive disorder"]),
 occupationalHealth: clinicalTopic("med-occupational-health", "Saúde e exposição ocupacional", ["Occupational Diseases", "Occupational Exposure"], ["occupational health"]),
 sportsInjury: clinicalTopic("med-sports-injury", "Lesões esportivas", ["Athletic Injuries"], ["sports injury", "athletic injury"]),
 rehabilitation: clinicalTopic("med-rehabilitation", "Reabilitação funcional", ["Rehabilitation", "Physical Therapy Modalities"], ["rehabilitation"]),
 criticalCare: clinicalTopic("med-critical-care", "Cuidados intensivos", ["Critical Care", "Intensive Care Units"], ["critical care", "intensive care"]),
 sleepApnea: clinicalTopic("med-sleep-apnea", "Apneia do sono", ["Sleep Apnea Syndromes"], ["sleep apnea"]),
 alcohol: clinicalTopic("med-alcohol", "Álcool e direção", ["Alcohol-Related Disorders", "Automobile Driving"], ["alcohol use", "driving under the influence"]),
 aki: clinicalTopic("med-aki", "Lesão renal aguda", ["Acute Kidney Injury"], ["acute kidney injury"]),
 pet: clinicalTopic("med-pet", "PET e medicina nuclear", ["Positron-Emission Tomography", "Nuclear Medicine"], ["PET imaging"]),
 screening: clinicalTopic("med-screening", "Rastreamento e prevenção", ["Mass Screening", "Primary Prevention"], ["screening"]),
 dialysis: clinicalTopic("med-dialysis", "Diálise e terapia renal substitutiva", ["Renal Dialysis"], ["dialysis"]),
 epilepsy: clinicalTopic("med-epilepsy", "Epilepsia", ["Epilepsy"], ["epilepsy"]),
 parkinsons: clinicalTopic("med-parkinsons", "Doença de Parkinson", ["Parkinson Disease"], ["Parkinson disease"]),
 multipleSclerosis: clinicalTopic("med-multiple-sclerosis", "Esclerose múltipla", ["Multiple Sclerosis"], ["multiple sclerosis"]),
 malnutrition: clinicalTopic("med-malnutrition", "Desnutrição e suporte nutricional", ["Malnutrition", "Nutritional Support"], ["malnutrition"]),
 obesity: clinicalTopic("med-obesity", "Obesidade", ["Obesity"], ["obesity"]),
 glaucoma: clinicalTopic("med-glaucoma", "Glaucoma", ["Glaucoma"], ["glaucoma"]),
 cataract: clinicalTopic("med-cataract", "Catarata", ["Cataract"], ["cataract"]),
 retinopathy: clinicalTopic("med-retinopathy", "Retinopatia diabética", ["Diabetic Retinopathy"], ["diabetic retinopathy"]),
 macular: clinicalTopic("med-macular", "Degeneração macular", ["Macular Degeneration"], ["macular degeneration"]),
 immunotherapy: clinicalTopic("med-immunotherapy", "Imunoterapia contra o câncer", ["Immunotherapy", "Neoplasms"], ["cancer immunotherapy"]),
 osteoarthritis: clinicalTopic("med-osteoarthritis", "Osteoartrite e artrose", ["Osteoarthritis"], ["osteoarthritis"]),
 fracture: clinicalTopic("med-fracture", "Fraturas e trauma ortopédico", ["Fractures, Bone"], ["bone fracture"]),
 hearingLoss: clinicalTopic("med-hearing-loss", "Perda auditiva", ["Hearing Loss"], ["hearing loss"]),
 sinusitis: clinicalTopic("med-sinusitis", "Rinossinusite", ["Sinusitis"], ["sinusitis", "rhinosinusitis"]),
 copd: clinicalTopic("med-copd", "DPOC", ["Pulmonary Disease, Chronic Obstructive"], ["chronic obstructive pulmonary disease", "COPD"]),
 interstitialLung: clinicalTopic("med-interstitial-lung", "Doenças pulmonares intersticiais", ["Lung Diseases, Interstitial"], ["interstitial lung disease"]),
 depressionAnxiety: clinicalTopic("med-anxiety", "Ansiedade e transtornos do humor", ["Anxiety Disorders", "Depressive Disorder"], ["anxiety disorder"]),
 schizophrenia: clinicalTopic("med-schizophrenia", "Esquizofrenia", ["Schizophrenia"], ["schizophrenia"]),
 diagnosticImaging: clinicalTopic("med-diagnostic-imaging", "Diagnóstico por imagem", ["Diagnostic Imaging", "Radiography"], ["diagnostic imaging"]),
 radiotherapy: clinicalTopic("med-radiotherapy", "Radioterapia e toxicidade", ["Radiotherapy", "Radiation Injuries"], ["radiotherapy"]),
 rheumatoid: clinicalTopic("med-rheumatoid", "Artrite reumatoide", ["Arthritis, Rheumatoid"], ["rheumatoid arthritis"]),
 lupus: clinicalTopic("med-lupus", "Lúpus eritematoso sistêmico", ["Lupus Erythematosus, Systemic"], ["systemic lupus erythematosus"]),
 gout: clinicalTopic("med-gout", "Gota", ["Gout"], ["gout"]),
 urinaryInfection: clinicalTopic("med-uti", "Infecção urinária", ["Urinary Tract Infections"], ["urinary tract infection"]),
 prostate: clinicalTopic("med-prostate", "Doenças da próstata", ["Prostatic Hyperplasia", "Prostatic Neoplasms"], ["prostate cancer", "benign prostatic hyperplasia"]),
 kidneyStones: clinicalTopic("med-kidney-stones", "Cálculos renais", ["Kidney Calculi"], ["kidney stones", "renal calculi"]),
};

const specialtyTopicIds: Record<string, string[]> = {
 acupuncture: ["pain", "migraine"], "allergy-immunology": ["asthma", "allergicRhinitis", "atopicDermatitis", "foodAllergy", "anaphylaxis", "urticaria"],
 anesthesiology: ["perioperative", "airway", "postoperativePain"], angiology: ["peripheralArtery", "venousThromboembolism", "aneurysm", "carotid"],
 "cardiovascular-surgery": ["coronarySurgery", "valveSurgery", "aneurysm", "congenital"], "hand-surgery": ["carpalTunnel", "handInjuries", "trauma"],
 "head-neck-surgery": ["headNeckCancer", "thyroid", "airway"], "digestive-surgery": ["colorectalCancer", "bariatric", "gallstones", "hernia"],
 "general-surgery": ["appendicitis", "gallstones", "hernia", "colorectalCancer"], "surgical-oncology": ["breastCancer", "colorectalCancer", "lungCancer", "immunotherapy"],
 "pediatric-surgery": ["congenital", "appendicitis", "trauma", "hernia"], "plastic-surgery": ["burns", "woundHealing", "breastCancer", "trauma"],
 "thoracic-surgery": ["lungCancer", "pneumothorax", "diagnosticImaging"], "vascular-surgery": ["peripheralArtery", "aneurysm", "carotid", "venousThromboembolism"],
 "internal-medicine": ["diabetes", "hypertension", "pneumonia", "heartFailure", "kidneyDisease", "sepsis"], coloproctology: ["colorectalCancer", "inflammatoryBowel", "hemorrhoids", "diverticular"],
 dermatology: ["psoriasis", "atopicDermatitis", "melanoma", "acne", "urticaria"], endoscopy: ["gerd", "colorectalCancer", "inflammatoryBowel"],
 gastroenterology: ["gerd", "inflammatoryBowel", "cirrhosis", "irritableBowel", "fattyLiver"], "medical-genetics": ["rareDisease", "breastCancer", "congenital"],
 geriatrics: ["dementia", "falls", "fracture", "diabetes", "hypertension"], "ob-gyn": ["pregnancy", "preeclampsia", "endometriosis", "breastCancer"],
 hematology: ["anemia", "leukemia", "lymphoma", "venousThromboembolism"], homeopathy: ["pain", "asthma", "irritableBowel"],
 "infectious-disease": ["hiv", "tuberculosis", "sepsis", "dengue", "antimicrobialResistance"], mastology: ["breastCancer", "diagnosticImaging"],
 "emergency-medicine": ["trauma", "stroke", "sepsis", "venousThromboembolism"], "family-medicine": ["hypertension", "diabetes", "vaccination", "depression", "screening"],
 "occupational-medicine": ["occupationalHealth", "asthma", "depression", "trauma"], "traffic-medicine": ["trauma", "sleepApnea", "alcohol"],
 "sports-medicine": ["sportsInjury", "pain", "screening", "heartFailure"], "physical-rehabilitation": ["rehabilitation", "stroke", "trauma", "osteoarthritis"],
 "critical-care": ["criticalCare", "sepsis", "pneumonia", "aki"], "forensic-medicine": ["trauma", "screening"],
 "nuclear-medicine": ["pet", "thyroid", "diagnosticImaging"], "preventive-social-medicine": ["screening", "vaccination", "diabetes", "hypertension"],
 nephrology: ["kidneyDisease", "aki", "dialysis", "sepsis"], neurosurgery: ["stroke", "aneurysm", "trauma", "epilepsy"],
 neurology: ["stroke", "epilepsy", "parkinsons", "dementia", "migraine", "multipleSclerosis"], nutrition: ["malnutrition", "obesity", "diabetes"],
 ophthalmology: ["glaucoma", "cataract", "retinopathy", "macular"], "medical-oncology": ["breastCancer", "lungCancer", "colorectalCancer", "immunotherapy"],
 orthopedics: ["osteoarthritis", "fracture", "pain", "sportsInjury"], otolaryngology: ["sinusitis", "hearingLoss", "asthma", "headNeckCancer"],
 pathology: ["breastCancer", "lungCancer", "diagnosticImaging"], "laboratory-medicine": ["anemia", "hiv", "tuberculosis", "diabetes"],
 pediatrics: ["asthma", "pneumonia", "vaccination", "congenital", "obesity"], pulmonology: ["asthma", "copd", "pneumonia", "interstitialLung", "lungCancer"],
 psychiatry: ["depression", "depressionAnxiety", "schizophrenia", "dementia"], radiology: ["diagnosticImaging", "stroke", "breastCancer", "lungCancer"],
 "radiation-oncology": ["radiotherapy", "breastCancer", "lungCancer", "prostate"], rheumatology: ["rheumatoid", "lupus", "gout", "osteoarthritis"],
 urology: ["prostate", "urinaryInfection", "kidneyStones", "kidneyDisease"],
};

export const specialtyTopicSets: Record<string, readonly ClinicalTopic[]> = {
 ...Object.fromEntries(Object.entries(specialtyTopicIds).map(([specialty, ids]) => [specialty, [generalTopics[0], ...ids.map((id) => topicBank[id as keyof typeof topicBank])]])),
 cardiology: cardiologyTopics,
 endocrinology: endocrinologyTopics,
};
export const topics = [...cardiologyTopics, ...endocrinologyTopics.slice(1), ...Object.values(topicBank)] as const;
export const states = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
// Landmark cardiology studies verified against their PubMed records.
export const collection: Article[] = [
 {id:"7968073",title:"Randomised trial of cholesterol lowering in 4444 patients with coronary heart disease: the Scandinavian Simvastatin Survival Study (4S)",journal:"The Lancet",date:"1994-11-19",authors:"Autores não listados no registro do PubMed",type:"Ensaio clínico",topic:"coronary",language:"eng",url:"https://pubmed.ncbi.nlm.nih.gov/7968073/"},
 {id:"2057034",title:"Effect of enalapril on survival in patients with reduced left ventricular ejection fractions and congestive heart failure",journal:"New England Journal of Medicine",date:"1991-08-01",authors:"SOLVD Investigators; Salim Yusuf et al.",type:"Ensaio clínico",topic:"heart-failure",doi:"10.1056/NEJM199108013250501",language:"eng",url:"https://pubmed.ncbi.nlm.nih.gov/2057034/"},
 {id:"26551272",title:"A Randomized Trial of Intensive versus Standard Blood-Pressure Control",journal:"New England Journal of Medicine",date:"2015-11-26",authors:"SPRINT Research Group",type:"Ensaio clínico",topic:"hypertension",doi:"10.1056/NEJMoa1511939",language:"eng",url:"https://pubmed.ncbi.nlm.nih.gov/26551272/"}];
// Three landmark diabetes trials, linked to their original PubMed records.
export const endocrinologyCollection: Article[] = [
 {id:"8366922",title:"The effect of intensive treatment of diabetes on the development and progression of long-term complications in insulin-dependent diabetes mellitus",journal:"New England Journal of Medicine",date:"1993-09-30",authors:"Diabetes Control and Complications Trial Research Group",type:"Ensaio clínico",topic:"endo-diabetes",doi:"10.1056/NEJM199309303291401",language:"eng",url:"https://pubmed.ncbi.nlm.nih.gov/8366922/"},
 {id:"9742976",title:"Intensive blood-glucose control with sulphonylureas or insulin compared with conventional treatment and risk of complications in patients with type 2 diabetes (UKPDS 33)",journal:"The Lancet",date:"1998-09-12",authors:"UK Prospective Diabetes Study (UKPDS) Group",type:"Ensaio clínico",topic:"endo-diabetes",doi:"10.1016/S0140-6736(98)07019-6",language:"eng",url:"https://pubmed.ncbi.nlm.nih.gov/9742976/"},
 {id:"11832527",title:"Reduction in the incidence of type 2 diabetes with lifestyle intervention or metformin",journal:"New England Journal of Medicine",date:"2002-02-07",authors:"Diabetes Prevention Program Research Group",type:"Ensaio clínico",topic:"endo-diabetes",doi:"10.1056/NEJMoa012512",language:"eng",url:"https://pubmed.ncbi.nlm.nih.gov/11832527/"},
];
// Selected recent SBC documents, linked to their official publishers. Do not copy protected full text.
export const brazilianGuidelines: BrazilianGuideline[] = [
 {id:"sbc-heart-failure-2026",title:"Diretriz Brasileira de Insuficiência Cardíaca – 2026",year:2026,topic:"heart-failure",topics:["heart-failure","cardiomyopathy"],kind:"Diretriz",scope:"Abrange diagnóstico, avaliação clínica, tratamento e acompanhamento da insuficiência cardíaca.",url:"https://journals.cardiol.br/article/diretriz-brasileira-de-insuficiencia-cardiaca-2026/"},
 {id:"sbc-valvular-2026",title:"Diretriz Brasileira de Valvopatias – 2026",year:2026,topic:"valvular",kind:"Diretriz",scope:"Reúne recomendações para avaliação e manejo das doenças das válvulas cardíacas.",url:"https://journals.cardiol.br/article/diretriz-brasileira-de-valvopatias-2026/"},
 {id:"sbc-cardiogeriatrics-2026",title:"Diretriz Brasileira de Cardiogeriatria – 2026",year:2026,topic:"cardiogeriatrics",kind:"Diretriz",scope:"Aborda particularidades da avaliação e do cuidado cardiovascular de pessoas idosas.",url:"https://journals.cardiol.br/article/diretriz-brasileira-de-cardiogeriatria-2026/"},
 {id:"sbc-electrical-storm-2026",title:"Posicionamento sobre Diagnóstico e Tratamento da Tempestade Elétrica – 2026",year:2026,topic:"arrhythmia",kind:"Posicionamento",scope:"Resume a abordagem de episódios recorrentes de arritmias ventriculares graves e suas opções de manejo.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782x-abc-123-4-e20260215/0066-782x-abc-123-4-e20260215.x98474.pdf"},
 {id:"sbc-systemic-imaging-2026",title:"Posicionamento sobre Avaliação Multimodalidade em Imagem Cardíaca em Pacientes com Doenças Sistêmicas – 2026",year:2026,topic:"imaging",kind:"Posicionamento",scope:"Discute como combinar métodos de imagem cardíaca na avaliação de pessoas com doenças sistêmicas.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782x-abc-123-4-e20260221/0066-782x-abc-123-4-e20260221.x98474.pdf"},
 {id:"sbc-sports-emergencies-2026",title:"Posicionamento sobre Emergências Cardiovasculares para Eventos Esportivos – 2026",year:2026,topic:"sports",kind:"Posicionamento",scope:"Orientações de prevenção, reconhecimento e resposta a emergências cardiovasculares em eventos esportivos.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782x-abc-123-4-e20260220/0066-782x-abc-123-4-e20260220.x98474.pdf"},
 {id:"sbc-stress-echo-2026",title:"Diretriz sobre Ecocardiografia de Estresse – 2026",year:2026,topic:"imaging",topics:["imaging","coronary"],kind:"Diretriz",scope:"Aborda indicações, execução e interpretação da ecocardiografia sob estresse.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-123-4-e20260223/0066-782X-abc-123-4-e20260223.x98474.pdf"},
 {id:"sbc-dengue-antithrombotic-2026",title:"Posicionamento sobre o Manejo de Antitrombóticos e Anticoagulantes em Dengue – 2026",year:2026,topic:"anticoagulation",topics:["anticoagulation","arrhythmia"],kind:"Posicionamento",scope:"Discute decisões sobre antitrombóticos e anticoagulantes quando dengue e risco trombótico coexistem.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782x-abc-123-4-e20260216/0066-782x-abc-123-4-e20260216.x98474.pdf"},
 {id:"sbc-pocus-2026",title:"Posicionamento sobre o Uso do Ultrassom Point of Care (POCUS) na Medicina Cardiovascular – 2026",year:2026,topic:"imaging",kind:"Posicionamento",scope:"Apresenta usos e limites do ultrassom à beira-leito na avaliação cardiovascular.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782x-abc-123-4-e20260222/0066-782x-abc-123-4-e20260222.x98474.pdf"},
 {id:"sbc-hypertension-2025",title:"Diretriz Brasileira de Hipertensão Arterial – 2025",year:2025,topic:"hypertension",kind:"Diretriz",scope:"Atualiza diagnóstico, estratificação de risco e tratamento da hipertensão arterial.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-122-09-e20250624/0066-782X-abc-122-09-e20250624.x74770.pdf"},
 {id:"sbc-women-cardiometabolic-2025",title:"Posicionamento sobre a Saúde Cardiometabólica ao Longo do Ciclo de Vida da Mulher – 2025",year:2025,topic:"women",topics:["women","prevention","obesity"],kind:"Posicionamento",scope:"Percorre fatores de risco e saúde cardiometabólica em diferentes fases da vida da mulher.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-122-09-e20250615/0066-782X-abc-122-09-e20250615.x74770.pdf"},
 {id:"sbc-obesity-prevention-2025",title:"Diretriz Brasileira Baseada em Evidências de 2025 para o Manejo da Obesidade e Prevenção de Doenças Cardiovasculares e Complicações Associadas à Obesidade: Uma Declaração de Posicionamento de Cinco Sociedades Médicas",year:2025,topic:"obesity",topics:["obesity","prevention","dyslipidemia"],kind:"Diretriz multissocietária",authorship:"SBC, SBEM, ABESO, SBD e Academia Brasileira do Sono",scope:"Recomenda uma abordagem integrada da obesidade e do risco cardiovascular; documento conjunto de cinco sociedades.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-122-09-e20250621/0066-782X-abc-122-09-e20250621.x74770.pdf"},
 {id:"sbc-atrial-fibrillation-2025",title:"Diretriz Brasileira de Fibrilação Atrial – 2025",year:2025,topic:"atrial-fibrillation",topics:["atrial-fibrillation","arrhythmia","anticoagulation"],kind:"Diretriz",scope:"Orienta diagnóstico e manejo da fibrilação atrial, incluindo prevenção de eventos tromboembólicos.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-122-09-e20250618/0066-782X-abc-122-09-e20250618.x74770.pdf"},
 {id:"sbc-chronic-coronary-syndrome-2025",title:"Diretriz de Síndrome Coronariana Crônica – 2025",year:2025,topic:"coronary",kind:"Diretriz",scope:"Aborda avaliação e tratamento de pessoas com doença coronariana crônica.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-122-09-e20250619/0066-782X-abc-122-09-e20250619.x74770.pdf"},
 {id:"sbc-chest-pain-2025",title:"Diretriz Brasileira de Atendimento à Dor Torácica na Unidade de Emergência – 2025",year:2025,topic:"acute-coronary",topics:["acute-coronary","coronary"],kind:"Diretriz",scope:"Organiza a investigação e a tomada de decisão inicial diante de dor torácica na emergência.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-122-09-e20250620/0066-782X-abc-122-09-e20250620.x74770.pdf"},
 {id:"sbc-dyslipidemia-2025",title:"Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose – 2025",year:2025,topic:"dyslipidemia",topics:["dyslipidemia","prevention"],kind:"Diretriz",scope:"Atualiza avaliação das lipoproteínas, risco aterosclerótico e estratégias de prevenção cardiovascular.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-122-09-e20250640/0066-782X-abc-122-09-e20250640.x74770.pdf"},
 {id:"sbc-perioperative-2024",title:"Diretriz de Avaliação Cardiovascular Perioperatória da Sociedade Brasileira de Cardiologia – 2024",year:2024,topic:"perioperative",topics:["perioperative","endocarditis"],kind:"Diretriz",scope:"Inclui uma seção sobre profilaxia da endocardite infecciosa; não é uma diretriz geral para o tratamento da endocardite.",url:"https://www.scielo.br/j/abc/a/NPrb8bhPV5J7bMDcqKT3SQr/?lang=pt"},
 {id:"sbc-ct-mri-2024",title:"Diretriz de Ressonância Magnética e Tomografia Computadorizada Cardiovascular – 2024",year:2024,topic:"imaging",kind:"Diretriz",scope:"Orienta indicações, protocolos e interpretação de ressonância e tomografia do coração.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-121-09-e20240608/0066-782X-abc-121-09-e20240608.x81990.pdf"},
 {id:"sbc-pediatric-ergometry-2024",title:"Diretriz Brasileira de Ergometria em Crianças e Adolescentes – 2024",year:2024,topic:"sports",kind:"Diretriz",scope:"Aborda avaliação ergométrica e teste de esforço em crianças e adolescentes.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-121-08-e20240525/0066-782X-abc-121-08-e20240525.x81990.pdf"},
 {id:"sbc-menopause-2024",title:"Diretriz Brasileira sobre a Saúde Cardiovascular no Climatério e na Menopausa – 2024",year:2024,topic:"women",kind:"Diretriz",scope:"Reúne aspectos cardiovasculares relacionados ao climatério e à menopausa.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-121-07-e20240478/0066-782X-abc-121-07-e20240478.x47225.pdf"},
 {id:"sbc-hypertrophic-cardiomyopathy-2024",title:"Diretriz sobre Diagnóstico e Tratamento da Cardiomiopatia Hipertrófica – 2024",year:2024,topic:"cardiomyopathy",kind:"Diretriz",scope:"Resume critérios diagnósticos, avaliação de risco e opções terapêuticas para cardiomiopatia hipertrófica.",url:"https://drive.google.com/file/d/1UxQOcB5lq-7IhNW_7WtydSqMVfn2xbe-/view?usp=sharing"},
 {id:"sbc-blood-pressure-2024",title:"Diretriz Brasileira de Medida da Pressão Arterial – 2024",year:2024,topic:"hypertension",kind:"Diretriz",scope:"Padroniza técnicas e condições de medida da pressão arterial em consultório e fora dele.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-121-4-e20240113/0066-782X-abc-121-4-e20240113.x47225.pdf"},
 {id:"sbc-adult-ergometry-2024",title:"Diretriz Brasileira de Ergometria em População Adulta – 2024",year:2024,topic:"sports",kind:"Diretriz",scope:"Orienta indicações, preparo, realização e interpretação da ergometria em adultos.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-121-3-e20240110/0066-782X-abc-121-3-e20240110.x47225.pdf"},
 {id:"sbc-vaping-2024",title:"Posicionamento sobre o Uso de Dispositivos Eletrônicos para Fumar – 2024",year:2024,topic:"prevention",kind:"Posicionamento",scope:"Discute evidências e implicações cardiovasculares do uso de cigarros eletrônicos.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-121-02-e20240063/0066-782X-abc-121-02-e20240063.x88402.pdf"},
 {id:"sbc-cardiac-devices-2023",title:"Diretriz Brasileira de Dispositivos Cardíacos Eletrônicos Implantáveis – 2023",year:2023,topic:"arrhythmia",topics:["arrhythmia","endocarditis"],kind:"Diretriz",scope:"Contém recomendações sobre infecção de dispositivos e endocardite relacionada ao sistema implantável; não substitui uma diretriz geral de endocardite.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-120-01-e20220892/0066-782X-abc-120-01-e20220892.x55156.pdf"},
 {id:"sbc-chagas-cardiomyopathy-2023",title:"Diretriz da SBC sobre Diagnóstico e Tratamento da Cardiomiopatia da Doença de Chagas – 2023",year:2023,topic:"chagas",topics:["chagas","cardiomyopathy","heart-failure"],kind:"Diretriz",scope:"Aborda manifestações cardíacas da doença de Chagas, diagnóstico e manejo da cardiomiopatia.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-120-06-e20230269/0066-782X-abc-120-06-e20230269.x55156.pdf"},
 {id:"sbc-myocardial-strain-2023",title:"Posicionamento sobre o Uso do Strain Miocárdico na Rotina do Cardiologista – 2023",year:2023,topic:"imaging",kind:"Posicionamento",scope:"Explica aplicações e limitações da análise de deformação miocárdica por imagem.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-120-09-e20230646/0066-782X-abc-120-09-e20230646.x88402.pdf"},
 {id:"sbc-carotid-ultrasound-2023",title:"Atualização da Recomendação para Avaliação da Doença das Artérias Carótidas e Vertebrais pela Ultrassonografia Vascular – 2023",year:2023,topic:"carotid",kind:"Atualização",scope:"Atualiza o uso da ultrassonografia vascular para avaliar carótidas e artérias vertebrais.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-120-10-e20230695/0066-782X-abc-120-10-e20230695.x55156.pdf"},
 {id:"sbc-ecg-reports-2022",title:"Diretriz sobre a Análise e Emissão de Laudos Eletrocardiográficos – 2022",year:2022,topic:"arrhythmia",kind:"Diretriz",scope:"Padroniza análise e elaboração de laudos de eletrocardiograma.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-119-04-0638/0066-782X-abc-119-04-0638.x55156.pdf"},
 {id:"sbc-myocarditis-2022",title:"Diretriz de Miocardites da Sociedade Brasileira de Cardiologia – 2022",year:2022,topic:"myocarditis",topics:["myocarditis","cardiomyopathy"],kind:"Diretriz",scope:"Trata do reconhecimento, investigação e cuidado das miocardites.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-119-01-0143/0066-782X-abc-119-01-0143.x55156.pdf"},
 {id:"sbc-vte-2022",title:"Diretriz Conjunta sobre Tromboembolismo Venoso – 2022",year:2022,topic:"venous-thromboembolism",topics:["venous-thromboembolism","anticoagulation"],kind:"Diretriz conjunta",authorship:"Documento conjunto; consultar a publicação para a lista completa de sociedades participantes",scope:"Aborda prevenção, diagnóstico e tratamento do tromboembolismo venoso.",url:"https://abccardiol.org/wp-content/uploads/articles_xml/0066-782X-abc-118-04-0797/0066-782X-abc-118-04-0797.x27815.pdf"},
 {id:"sbc-aortic-surgery-2004",title:"Diretrizes para a Cirurgia das doenças da Aorta",year:2004,topic:"aortic",kind:"Diretriz",scope:"Registro histórico de cirurgia da aorta no acervo oficial da SBC; ano 2004. O acervo consultado não apresentou uma atualização SBC específica mais recente para este tema.",url:"https://drive.google.com/file/d/1-B-EW2jriqj-i8eJYPWC2hC6cs9DTF41/view?usp=sharing"},
];
// Seleção inicial de documentos oficiais da SBEM ou elaborados com participação da sociedade.
// Os links levam à publicação original; o escopo explicita quando a diretriz é multissocietária.
export const endocrineGuidelines: BrazilianGuideline[] = [
 {id:"sbem-macroprolactinemia-2025",title:"Position statement on macroprolactinemia",year:2025,topic:"endo-pituitary",kind:"Posicionamento",authorship:"SBEM e SBPC/ML",scope:"Explica o que é macroprolactina, como os exames a identificam e quando considerar a investigação, para reduzir exames e tratamentos desnecessários.",url:"https://www.aem-sbem.com/article/position-statement-on-macroprolactinemia-from-the-department-of-neuroendocrinology-of-the-brazilian-society-of-endocrinology-and-metabolism-sbem-and-the-brazilian-society-of-clinical-pathology-labor/"},
 {id:"sbem-iodine-pregnancy-2025",title:"Suplementação universal de iodo na gestação no Brasil: posicionamento do Departamento de Tireoide",year:2025,topic:"endo-thyroid",topics:["endo-thyroid","endo-reproductive"],kind:"Posicionamento",authorship:"SBEM — Departamento de Tireoide",scope:"Discute deficiência e excesso de iodo na gestação e a evidência brasileira sobre suplementação universal.",url:"https://www.aem-sbem.com/article/should-iodine-supplementation-be-universally-recommended-for-pregnant-women-in-brazil-a-position-statement-from-the-thyroid-department-of-the-brazilian-society-of-endocrinology-and-metabolism-sbem/"},
 {id:"sbem-obesity-cardiovascular-2025",title:"Diretriz brasileira baseada em evidências para obesidade e prevenção cardiovascular — 2025",year:2025,topic:"endo-obesity",topics:["endo-obesity","endo-diabetes","endo-lipids"],kind:"Diretriz multissocietária",authorship:"SBEM, ABESO, SBD, SBC e Academia Brasileira do Sono",scope:"Reúne recomendações para manejo da obesidade e prevenção de doença cardiovascular e complicações associadas. Texto integral aberto no PubMed Central.",url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC12625227/"},
 {id:"sbem-abeso-obesity-pharmacological-2024",title:"Tratamento farmacológico da obesidade em adultos e impacto nas comorbidades — atualização 2024",year:2024,topic:"endo-obesity",kind:"Posicionamento",authorship:"SBEM e ABESO",scope:"Revisa medicamentos aprovados e opções emergentes para obesidade em adultos; confira o texto original para critérios, contraindicações e atualização regulatória.",url:"https://www.aem-sbem.com/article/pharmacologic-treatment-of-obesity-in-adults-and-its-impact-on-comorbidities-2024-update-and-position-statement-of-specialists-from-the-brazilian-association-for-the-study-of-obesity-and-metabolic-sy/"},
 {id:"sbem-masld-2023",title:"Diretriz brasileira para rastreamento, diagnóstico, tratamento e seguimento da MASLD em adultos com sobrepeso ou obesidade",year:2023,topic:"endo-liver",topics:["endo-liver","endo-obesity","endo-diabetes"],kind:"Diretriz conjunta",authorship:"SBEM, Sociedade Brasileira de Hepatologia e ABESO",scope:"Aborda doença hepática esteatótica associada à disfunção metabólica em adultos com sobrepeso ou obesidade, do rastreamento ao acompanhamento.",url:"https://www.aem-sbem.com/article/brazilian-evidence-based-guideline-for-screening-diagnosis-treatment-and-follow-up-of-metabolic-dysfunction-associated-steatotic-liver-disease-masld-in-adult-individuals-with-overweight-or-obesit/"},
 {id:"sbem-thyroid-ablation-2024",title:"Consenso brasileiro sobre ablação térmica de nódulos tireoidianos",year:2024,topic:"endo-thyroid",kind:"Consenso conjunto",authorship:"SBEM, Sociedade Brasileira de Radiologia Intervencionista e Cirurgia Endovascular e Sociedade Brasileira de Cirurgia de Cabeça e Pescoço",scope:"Discute indicações, avaliação pré-procedimento, técnica, seguimento, complicações e treinamento em ablação térmica de nódulos.",url:"https://www.aem-sbem.com/article/brazilian-consensus-on-the-application-of-thermal-ablation-for-treatment-of-thyroid-nodules-a-task-force-statement-by-the-brazilian-society-of-interventional-radiology-and-endovascular-surgery-sobri/"},
 {id:"sbem-hyperprolactinemia-diagnosis-2024",title:"Diagnóstico da hiperprolactinemia em mulheres",year:2024,topic:"endo-pituitary",topics:["endo-pituitary","endo-reproductive"],kind:"Posicionamento conjunto",authorship:"SBEM e FEBRASGO",scope:"Resume a investigação de causas fisiológicas, medicamentosas e patológicas e a distinção entre prolactinoma e outras causas de prolactina elevada.",url:"https://www.aem-sbem.com/article/diagnosis-of-hyperprolactinemia-in-women-a-position-statement-from-the-brazilian-federation-of-gynecology-and-obstetrics-associations-febrasgo-and-the-brazilian-society-of-endocrinology-and-metabol/"},
 {id:"sbem-hyperprolactinemia-treatment-2024",title:"Tratamento da hiperprolactinemia em mulheres",year:2024,topic:"endo-pituitary",topics:["endo-pituitary","endo-reproductive"],kind:"Posicionamento conjunto",authorship:"SBEM e FEBRASGO",scope:"Aborda tratamento da hiperprolactinemia sintomática e prolactinomas, incluindo situações relacionadas à gestação.",url:"https://www.aem-sbem.com/article/treatment-of-hyperprolactinemia-in-women-a-position-statement-from-the-brazilian-federation-of-gynecology-and-obstetrics-associations-febrasgo-and-the-brazilian-society-of-endocrinology-and-metabol/"},
 {id:"sbem-hypothyroidism-special-2022",title:"Hipotireoidismo primário em situações especiais na vida adulta",year:2022,topic:"endo-thyroid",kind:"Posicionamento",authorship:"SBEM — Departamento de Tireoide",scope:"Discute hipotireoidismo em idosos, hipotireoidismo subclínico em pessoas com doença cardíaca e casos de difícil controle.",url:"https://www.aem-sbem.com/article/approach-to-adult-patients-with-primary-hypothyroidism-in-some-special-situations-a-position-statement-from-the-thyroid-department-of-the-brazilian-society-of-endocrinology-and-metabolism-sbem/"},
 {id:"sbem-papillary-thyroid-cancer-2022",title:"Estratégias para carcinoma papilífero de tireoide de baixo risco",year:2022,topic:"endo-thyroid",kind:"Posicionamento",authorship:"SBEM — Departamento de Tireoide",scope:"Apresenta opções para tumores papilíferos de baixo risco, incluindo critérios de vigilância ativa e indicação de cirurgia.",url:"https://www.aem-sbem.com/article/treatment-strategies-for-low-risk-papillary-thyroid-carcinoma-a-position-statement-from-the-thyroid-department-of-the-brazilian-society-of-endocrinology-and-metabolism-sbem/"},
 {id:"sbem-obesity-classification-2022",title:"Classificação da obesidade baseada no histórico de peso",year:2022,topic:"endo-obesity",kind:"Documento oficial",authorship:"SBEM e ABESO",scope:"Propõe classificar a obesidade considerando também o maior peso atingido ao longo da vida; é um documento conceitual, não uma diretriz completa de tratamento.",url:"https://www.aem-sbem.com/article/proposal-of-an-obesity-classification-based-on-weight-history-an-official-document-by-the-brazilian-society-of-endocrinology-and-metabolism-sbem-and-the-brazilian-society-for-the-study-of-obesity-a/"},
 {id:"sbem-osteoporosis-very-high-risk-2022",title:"Risco muito alto de fratura na osteoporose pós-menopausa: definição e manejo",year:2022,topic:"endo-bone",kind:"Posicionamento conjunto",authorship:"SBEM e ABRASSO",scope:"Discute identificação de mulheres com risco muito alto de fratura e o lugar de terapias anabólicas; consulte o artigo para critérios e limites de aplicação.",url:"https://www.aem-sbem.com/article/definition-and-management-of-very-high-fracture-risk-in-women-with-postmenopausal-osteoporosis-a-position-statement-from-the-brazilian-society-of-endocrinology-and-metabolism-sbem-and-the-brazilian/"},
 {id:"sbem-vitamin-d-2020",title:"Valores de referência da 25-hidroxivitamina D: revisão do posicionamento",year:2020,topic:"endo-bone",kind:"Posicionamento conjunto",authorship:"SBEM e SBPC/ML",scope:"Discute métodos e limitações da dosagem de vitamina D e em quais grupos pode ser indicada sua avaliação.",url:"https://www.aem-sbem.com/article/reference-values-of-25-hydroxyvitamin-d-revisited-a-position-statement-from-the-brazilian-society-of-endocrinology-and-metabolism-sbem-and-the-brazilian-society-of-clinical-pathology-laboratory-med/"},
 {id:"sbem-hypoparathyroidism-2018",title:"Diagnóstico e tratamento do hipoparatireoidismo",year:2018,topic:"endo-bone",kind:"Diretriz / posicionamento",authorship:"SBEM — Departamento de Metabolismo Ósseo e Mineral; elaborado segundo o programa de diretrizes da AMB",scope:"Revisa evidências para o diagnóstico e tratamento do hipoparatireoidismo. Documento mais antigo; confira se há atualização posterior antes de aplicar recomendações.",url:"https://www.aem-sbem.com/article/diagnosis-and-treatment-of-hypoparathyroidism-a-position-statement-from-the-brazilian-society-of-endocrinology-and-metabolism/"},
 {id:"sbem-subclinical-hypothyroidism-2013",title:"Abordagem clínica e tratamento do hipotireoidismo subclínico em adultos",year:2013,topic:"endo-thyroid",kind:"Consenso histórico",authorship:"SBEM — Departamento de Tireoide",scope:"Consenso brasileiro sobre hipotireoidismo subclínico em adultos. Publicado em 2013; pode estar desatualizado e deve ser lido como referência histórica até confirmar atualização vigente.",url:"https://www.aem-sbem.com/article/the-brazilian-consensus-for-the-clinical-approach-and-treatment-of-subclinical-hypothyroidism-in-adults-recommendations-of-the-thyroid-department-of-the-brazilian-society-of-endocrinology-and-metabol/"},
 {id:"sbem-hyperthyroidism-2013",title:"Consenso brasileiro para diagnóstico e tratamento do hipertireoidismo",year:2013,topic:"endo-thyroid",kind:"Consenso histórico",authorship:"SBEM — Departamento de Tireoide",scope:"Documento sobre investigação e tratamento da tireotoxicose. Publicado em 2013; consulte a publicação para verificar seu alcance e eventuais atualizações.",url:"https://www.aem-sbem.com/article/the-brazilian-consensus-for-the-diagnosis-and-treatment-of-hyperthyroidism-recommendations-by-the-thyroid-department-of-the-brazilian-society-of-endocrinology-and-metabolism/"},
 {id:"sbem-thyroid-nodules-cancer-2013",title:"Nódulos tireoidianos e câncer diferenciado da tireoide: atualização do consenso brasileiro",year:2013,topic:"endo-thyroid",kind:"Consenso histórico",authorship:"Consenso brasileiro de tireoide publicado no periódico oficial da SBEM",scope:"Aborda avaliação de nódulos e câncer diferenciado da tireoide. Publicado em 2013; incluído como referência histórica, com atualização vigente a confirmar.",url:"https://www.aem-sbem.com/article/thyroid-nodules-and-differentiated-thyroid-cancer-update-on-the-brazilian-consensus/"},
];
export const translations: Record<string,string> = {"insuficiencia cardiaca":"heart failure","hipertensao":"hypertension","hipertensao arterial":"hypertension","fibrilacao atrial":"atrial fibrillation","arritmia":"arrhythmia","arritmias":"arrhythmia","infarto":"myocardial infarction","sindrome coronariana aguda":"acute coronary syndrome","doenca coronariana":"coronary artery disease","doenca arterial coronariana":"coronary artery disease","dislipidemia":"dyslipidemia","dislipidemias":"dyslipidemia","prevencao":"cardiovascular prevention","valvopatias":"heart valve diseases","cardiomiopatia":"cardiomyopathy","cardiomiopatias":"cardiomyopathy","doenca da aorta":"aortic disease","doenca arterial periferica":"peripheral arterial disease","cardiopatia congenita":"congenital heart disease","pericardite":"pericarditis","endocardite":"endocarditis","hipertensao pulmonar":"pulmonary hypertension","parada cardiorrespiratoria":"cardiac arrest","semaglutida":"semaglutide","empagliflozina":"empagliflozin"};
export function normalized(s: string) { return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }

const riskQuery = "(cardiovascular[Title] AND (risk[Title] OR risks[Title]))";
const estrogenQuery = "(estrogen[Title] OR estrogens[Title] OR oestrogen[Title] OR oestrogens[Title])";
const titlePhraseQueries: Array<[string, string]> = [
 ["pressao alta", '("Hypertension"[MeSH Terms] OR hypertension[Title] OR "high blood pressure"[Title])'],
 ["hipertensao arterial", '("Hypertension"[MeSH Terms] OR hypertension[Title] OR "high blood pressure"[Title])'],
 ["congestive heart failure", '("Heart Failure"[MeSH Terms] OR "congestive heart failure"[Title] OR "heart failure"[Title/Abstract])'],
 ["chronic obstructive pulmonary disease", '("Pulmonary Disease, Chronic Obstructive"[MeSH Terms] OR COPD[Title/Abstract] OR "chronic obstructive pulmonary disease"[Title/Abstract])'],
 ["chronic kidney disease", '("Renal Insufficiency, Chronic"[MeSH Terms] OR "chronic kidney disease"[Title/Abstract] OR CKD[Title/Abstract])'],
 ["acute kidney injury", '("Acute Kidney Injury"[MeSH Terms] OR "acute kidney injury"[Title/Abstract] OR "acute renal failure"[Title/Abstract])'],
 ["coronary artery disease", '("Coronary Artery Disease"[MeSH Terms] OR "coronary artery disease"[Title/Abstract] OR "coronary heart disease"[Title/Abstract])'],
 ["acute coronary syndrome", '("Acute Coronary Syndrome"[MeSH Terms] OR "acute coronary syndrome"[Title/Abstract])'],
 ["high blood pressure", '("Hypertension"[MeSH Terms] OR hypertension[Title/Abstract] OR "high blood pressure"[Title/Abstract])'],
 ["myocardial infarction", '("Myocardial Infarction"[MeSH Terms] OR "myocardial infarction"[Title/Abstract] OR "heart attack"[Title/Abstract])'],
 ["atrial fibrillation", '("Atrial Fibrillation"[MeSH Terms] OR "atrial fibrillation"[Title/Abstract])'],
 ["pulmonary hypertension", '("Hypertension, Pulmonary"[MeSH Terms] OR "pulmonary hypertension"[Title/Abstract] OR "pulmonary arterial hypertension"[Title/Abstract])'],
 ["valvular heart disease", '("Heart Valve Diseases"[MeSH Terms] OR "valvular heart disease"[Title/Abstract] OR "heart valve disease"[Title/Abstract])'],
 ["type 2 diabetes", '("Diabetes Mellitus, Type 2"[MeSH Terms] OR "type 2 diabetes"[Title/Abstract] OR "type II diabetes"[Title/Abstract])'],
 ["type 1 diabetes", '("Diabetes Mellitus, Type 1"[MeSH Terms] OR "type 1 diabetes"[Title/Abstract] OR "type I diabetes"[Title/Abstract])'],
 ["heart failure", '("Heart Failure"[MeSH Terms] OR "heart failure"[Title/Abstract] OR "cardiac failure"[Title/Abstract])'],
 ["cardiac arrest", '("Heart Arrest"[MeSH Terms] OR "cardiac arrest"[Title/Abstract] OR "heart arrest"[Title/Abstract])'],
 ["insuficiencia renal", '("Kidney Diseases"[MeSH Terms] OR renal insufficiency[Title] OR kidney failure[Title])'],
 ["infarto do miocardio", '("Myocardial Infarction"[MeSH Terms] OR "myocardial infarction"[Title] OR "heart attack"[Title])'],
 ["doenca de chagas", '("Chagas Cardiomyopathy"[MeSH Terms] OR "Chagas disease"[Title] OR "Chagas cardiomyopathy"[Title])'],
 ["dor toracica", '("Chest Pain"[MeSH Terms] OR "chest pain"[Title])'],
 ["colesterol alto", '("Hypercholesterolemia"[MeSH Terms] OR hypercholesterolemia[Title] OR dyslipidemia[Title])'],
 ["pressao arterial", '("Blood Pressure"[MeSH Terms] OR "blood pressure"[Title] OR hypertension[Title])'],
 ["cancer de colo uterino", '("Uterine Cervical Neoplasms"[MeSH Terms] OR "cervical cancer"[Title])'],
 ["cancer de ovario", '("Ovarian Neoplasms"[MeSH Terms] OR "ovarian cancer"[Title])'],
 ["cancer de endometrio", '("Endometrial Neoplasms"[MeSH Terms] OR "endometrial cancer"[Title])'],
 ["doenca hepatica gordurosa", '("Non-alcoholic Fatty Liver Disease"[MeSH Terms] OR "fatty liver"[Title] OR MASLD[Title])'],
 ["sindrome metabolica", '("Metabolic Syndrome"[MeSH Terms] OR "metabolic syndrome"[Title])'],
 ["artrite gotosa", '("Gout"[MeSH Terms] OR gout[Title] OR "gouty arthritis"[Title])'],
 ["lombalgia", '("Low Back Pain"[MeSH Terms] OR "low back pain"[Title] OR lumbago[Title])'],
 ["dor lombar", '("Low Back Pain"[MeSH Terms] OR "low back pain"[Title] OR lumbago[Title])'],
 ["doenca pulmonar intersticial", '("Lung Diseases, Interstitial"[MeSH Terms] OR "interstitial lung disease"[Title])'],
 ["parada cardiorrespiratoria", '("Heart Arrest"[MeSH Terms] OR "cardiac arrest"[Title] OR "heart arrest"[Title])'],
 ["insuficiencia cardiaca", '("Heart Failure"[MeSH Terms] OR "heart failure"[Title] OR "cardiac failure"[Title])'],
 ["cancer de mama", '("Breast Neoplasms"[MeSH Terms] OR "breast cancer"[Title] OR "breast carcinoma"[Title])'],
 ["cancer de pulmao", '("Lung Neoplasms"[MeSH Terms] OR "lung cancer"[Title] OR "lung carcinoma"[Title])'],
 ["cancer colorretal", '("Colorectal Neoplasms"[MeSH Terms] OR "colorectal cancer"[Title] OR "colorectal carcinoma"[Title])'],
 ["cancer de prostata", '("Prostatic Neoplasms"[MeSH Terms] OR "prostate cancer"[Title])'],
 ["cancer de pele", '("Skin Neoplasms"[MeSH Terms] OR "skin cancer"[Title])'],
 ["doenca renal cronica", '("Renal Insufficiency, Chronic"[MeSH Terms] OR "chronic kidney disease"[Title] OR CKD[Title])'],
 ["lesao renal aguda", '("Acute Kidney Injury"[MeSH Terms] OR "acute kidney injury"[Title] OR "acute renal failure"[Title])'],
 ["doenca pulmonar obstrutiva cronica", '("Pulmonary Disease, Chronic Obstructive"[MeSH Terms] OR COPD[Title] OR "chronic obstructive pulmonary disease"[Title])'],
 ["doenca inflamatoria intestinal", '("Inflammatory Bowel Diseases"[MeSH Terms] OR "inflammatory bowel disease"[Title] OR Crohn[Title])'],
 ["artrite reumatoide", '("Arthritis, Rheumatoid"[MeSH Terms] OR "rheumatoid arthritis"[Title])'],
 ["lupus eritematoso sistemico", '("Lupus Erythematosus, Systemic"[MeSH Terms] OR "systemic lupus erythematosus"[Title])'],
 ["sindrome do intestino irritavel", '("Irritable Bowel Syndrome"[MeSH Terms] OR "irritable bowel syndrome"[Title])'],
 ["rinite alergica", '("Rhinitis, Allergic"[MeSH Terms] OR "allergic rhinitis"[Title])'],
 ["dermatite atopica", '("Dermatitis, Atopic"[MeSH Terms] OR "atopic dermatitis"[Title] OR eczema[Title])'],
 ["sindrome do tunel do carpo", '("Carpal Tunnel Syndrome"[MeSH Terms] OR "carpal tunnel syndrome"[Title])'],
 ["tromboembolismo venoso", '("Venous Thromboembolism"[MeSH Terms] OR "venous thromboembolism"[Title])'],
 ["doenca arterial periferica", '("Peripheral Arterial Disease"[MeSH Terms] OR "peripheral artery disease"[Title])'],
 ["sindrome coronariana aguda", '("Acute Coronary Syndrome"[MeSH Terms] OR "acute coronary syndrome"[Title])'],
 ["cancer de cabeca e pescoco", '("Head and Neck Neoplasms"[MeSH Terms] OR "head and neck cancer"[Title])'],
 ["esclerose multipla", '("Multiple Sclerosis"[MeSH Terms] OR "multiple sclerosis"[Title])'],
 ["doenca de parkinson", '("Parkinson Disease"[MeSH Terms] OR "Parkinson disease"[Title])'],
 ["doenca de alzheimer", '("Alzheimer Disease"[MeSH Terms] OR "Alzheimer disease"[Title])'],
 ["degeneracao macular", '("Macular Degeneration"[MeSH Terms] OR "macular degeneration"[Title])'],
 ["retinopatia diabetica", '("Diabetic Retinopathy"[MeSH Terms] OR "diabetic retinopathy"[Title])'],
 ["apneia do sono", '("Sleep Apnea Syndromes"[MeSH Terms] OR "sleep apnea"[Title])'],
 ["sindrome dos ovarios policisticos", '("Polycystic Ovary Syndrome"[MeSH Terms] OR PCOS[Title])'],
 ["acidente vascular cerebral", '("Stroke"[MeSH Terms] OR stroke[Title] OR "cerebrovascular accident"[Title])'],
 ["infeccao do trato urinario", '("Urinary Tract Infections"[MeSH Terms] OR "urinary tract infection"[Title])'],
 ["infeccao urinaria", '("Urinary Tract Infections"[MeSH Terms] OR "urinary tract infection"[Title])'],
 ["calculo renal", '("Kidney Calculi"[MeSH Terms] OR "kidney stones"[Title] OR "renal calculi"[Title])'],
 ["dor cronica", '("Chronic Pain"[MeSH Terms] OR "chronic pain"[Title])'],
 ["cancer de estomago", '("Stomach Neoplasms"[MeSH Terms] OR "gastric cancer"[Title] OR "stomach cancer"[Title])'],
 ["cancer de figado", '("Liver Neoplasms"[MeSH Terms] OR "liver cancer"[Title] OR "hepatocellular carcinoma"[Title])'],
 ["cancer de pancreas", '("Pancreatic Neoplasms"[MeSH Terms] OR "pancreatic cancer"[Title])'],
 ["doenca pulmonar intersticial", '("Lung Diseases, Interstitial"[MeSH Terms] OR "interstitial lung disease"[Title])'],
 ["infeccao por hiv", '("HIV Infections"[MeSH Terms] OR HIV[Title] OR AIDS[Title])'],
 ["tuberculose", '("Tuberculosis"[MeSH Terms] OR tuberculosis[Title])'],
 ["hipotireoidismo", '("Hypothyroidism"[MeSH Terms] OR hypothyroidism[Title] OR hypothyroid[Title])'],
 ["hipertireoidismo", '("Hyperthyroidism"[MeSH Terms] OR hyperthyroidism[Title] OR hyperthyroid[Title])'],
 ["diabetes mellitus tipo 2", '("type 2 diabetes mellitus"[Title] OR "type II diabetes"[Title])'], ["diabetes tipo 2", '("type 2 diabetes"[Title] OR "type II diabetes"[Title])'],
 ["hipotireoidismo", '(hypothyroidism[Title] OR hypothyroid[Title])'], ["hipertireoidismo", '(hyperthyroidism[Title] OR hyperthyroid[Title])'],
 ["cancer de tireoide", '("thyroid cancer"[Title] OR "thyroid carcinoma"[Title])'], ["nodulo tireoidiano", '("thyroid nodule"[Title] OR "thyroid nodules"[Title])'],
 ["sindrome dos ovarios policisticos", '("polycystic ovary syndrome"[Title] OR PCOS[Title])'], ["puberdade precoce", '("precocious puberty"[Title] OR "early puberty"[Title])'],
 ["osteoporose", 'osteoporosis[Title]'], ["macroprolactinemia", 'macroprolactinemia[Title]'], ["hiperprolactinemia", 'hyperprolactinemia[Title]'],
 ["doenca de cushing", '("Cushing disease"[Title] OR "Cushing syndrome"[Title])'], ["sindrome de cushing", '("Cushing syndrome"[Title] OR "Cushing disease"[Title])'],
 ["fatores de risco cardiovascular", riskQuery], ["fator de risco cardiovascular", riskQuery], ["risco cardiovascular", riskQuery],
 ["cardiovascular risk factors", riskQuery], ["cardiovascular risk factor", riskQuery], ["cardiovascular risk", riskQuery],
 ["insuficiencia cardiaca", '("heart failure"[Title] OR "cardiac failure"[Title])'], ["heart failure", '("heart failure"[Title] OR "cardiac failure"[Title])'],
 ["fibrilacao atrial", '"atrial fibrillation"[Title]'], ["atrial fibrillation", '"atrial fibrillation"[Title]'],
 ["sindrome coronariana aguda", '"acute coronary syndrome"[Title]'], ["acute coronary syndrome", '"acute coronary syndrome"[Title]'],
 ["doenca arterial coronariana", '"coronary artery disease"[Title]'], ["doenca coronariana", '"coronary artery disease"[Title]'], ["coronary artery disease", '"coronary artery disease"[Title]'],
 ["hipertensao pulmonar", '("pulmonary hypertension"[Title] OR "pulmonary arterial hypertension"[Title])'], ["pulmonary hypertension", '("pulmonary hypertension"[Title] OR "pulmonary arterial hypertension"[Title])'],
 ["dislipidemia", '(dyslipidemia[Title] OR dyslipidaemia[Title])'], ["valvopatias", '("heart valve disease"[Title] OR "valvular heart disease"[Title])'],
 ["doenca arterial periferica", '"peripheral arterial disease"[Title]'], ["cardiopatia congenita", '"congenital heart disease"[Title]'],
 ["parada cardiorrespiratoria", '("cardiac arrest"[Title] OR "heart arrest"[Title])'], ["estrogenic hormone", estrogenQuery],
 ["estrogenios", estrogenQuery], ["estrogenio", estrogenQuery], ["estrogens", estrogenQuery], ["estrogen", estrogenQuery],
].sort((a, b) => b[0].length - a[0].length) as Array<[string, string]>;

const titleWordQueries: Record<string, string> = {
 dm1: '("Diabetes Mellitus, Type 1"[MeSH Terms] OR "type 1 diabetes"[Title] OR "type I diabetes"[Title])',
 dm2: '("Diabetes Mellitus, Type 2"[MeSH Terms] OR "type 2 diabetes"[Title] OR "type II diabetes"[Title])',
 iam: '("Myocardial Infarction"[MeSH Terms] OR "myocardial infarction"[Title] OR "heart attack"[Title])',
 dpoc: '("Pulmonary Disease, Chronic Obstructive"[MeSH Terms] OR COPD[Title] OR "chronic obstructive pulmonary disease"[Title])',
 avc: '("Stroke"[MeSH Terms] OR stroke[Title] OR "cerebrovascular accident"[Title])',
 masld: '("Non-alcoholic Fatty Liver Disease"[MeSH Terms] OR MASLD[Title] OR NAFLD[Title])',
 cancer: '("Neoplasms"[MeSH Terms] OR cancer[Title] OR neoplasm[Title])', neoplasia: '("Neoplasms"[MeSH Terms] OR neoplasm[Title])', tumor: '("Neoplasms"[MeSH Terms] OR tumor[Title] OR tumour[Title])',
 mama: '("Breast Neoplasms"[MeSH Terms] OR breast[Title])', pulmao: '("Lung Neoplasms"[MeSH Terms] OR lung[Title])', prostata: '("Prostatic Neoplasms"[MeSH Terms] OR prostate[Title])',
 asma: '("Asthma"[MeSH Terms] OR asthma[Title])', pneumonia: '("Pneumonia"[MeSH Terms] OR pneumonia[Title])',  derrame: '("Stroke"[MeSH Terms] OR stroke[Title])',
 renal: '("Kidney Diseases"[MeSH Terms] OR renal[Title] OR kidney[Title])', rim: '("Kidney Diseases"[MeSH Terms] OR kidney[Title])', hepatico: '("Liver Diseases"[MeSH Terms] OR liver[Title] OR hepatic[Title])',
 artrite: '("Arthritis"[MeSH Terms] OR arthritis[Title])', artrose: '("Osteoarthritis"[MeSH Terms] OR osteoarthritis[Title])', enxaqueca: '("Migraine Disorders"[MeSH Terms] OR migraine[Title])',
 depressao: '("Depressive Disorder"[MeSH Terms] OR depression[Title])', ansiedade: '("Anxiety Disorders"[MeSH Terms] OR anxiety[Title])', sepse: '("Sepsis"[MeSH Terms] OR sepsis[Title])',
 dengue: '("Dengue"[MeSH Terms] OR dengue[Title])', tuberculose: '("Tuberculosis"[MeSH Terms] OR tuberculosis[Title])', hiv: '("HIV Infections"[MeSH Terms] OR HIV[Title])', aids: '("Acquired Immunodeficiency Syndrome"[MeSH Terms] OR AIDS[Title])',
 gravidez: '("Pregnancy"[MeSH Terms] OR pregnancy[Title])', gestacao: '("Pregnancy"[MeSH Terms] OR pregnancy[Title])', preeclampsia: '("Pre-Eclampsia"[MeSH Terms] OR preeclampsia[Title])',
 glaucoma: '("Glaucoma"[MeSH Terms] OR glaucoma[Title])', catarata: '("Cataract"[MeSH Terms] OR cataract[Title])', epilepsia: '("Epilepsy"[MeSH Terms] OR epilepsy[Title])',
 leucemia: '("Leukemia"[MeSH Terms] OR leukemia[Title])', linfoma: '("Lymphoma"[MeSH Terms] OR lymphoma[Title])', anemia: '("Anemia"[MeSH Terms] OR anemia[Title] OR anaemia[Title])',
 psoriase: '("Psoriasis"[MeSH Terms] OR psoriasis[Title])', melanoma: '("Melanoma"[MeSH Terms] OR melanoma[Title])', acne: '("Acne Vulgaris"[MeSH Terms] OR acne[Title])',
 sinusite: '("Sinusitis"[MeSH Terms] OR sinusitis[Title])', otite: '("Otitis"[MeSH Terms] OR otitis[Title])', audicao: '("Hearing Loss"[MeSH Terms] OR hearing[Title])',
 fratura: '("Fractures, Bone"[MeSH Terms] OR fracture[Title])', trauma: '("Wounds and Injuries"[MeSH Terms] OR trauma[Title] OR injury[Title])',
 hemodialise: '("Renal Dialysis"[MeSH Terms] OR hemodialysis[Title] OR haemodialysis[Title])', dialise: '("Renal Dialysis"[MeSH Terms] OR dialysis[Title])',
 dor: '("Pain"[MeSH Terms] OR pain[Title])', sono: '("Sleep Wake Disorders"[MeSH Terms] OR sleep[Title])', nutricional: '("Nutritional Status"[MeSH Terms] OR nutrition[Title])',
 estradiol: "estradiol[Title]", risco: "(risk[Title] OR risks[Title])", riscos: "(risk[Title] OR risks[Title])",
 cardiovascular: "cardiovascular[Title]", estrogenio: estrogenQuery, estrogenios: estrogenQuery, estrogen: estrogenQuery, estrogens: estrogenQuery,
 hipertensao: '(hypertension[Title] OR "high blood pressure"[Title])', infarto: '("myocardial infarction"[Title] OR "heart attack"[Title])',
 colesterol: '(cholesterol[Title] OR dyslipidemia[Title] OR dyslipidaemia[Title])', diabetes: "diabetes[Title]", prevencao: "prevention[Title]",
 menopausa: "menopause[Title]", menopausal: "menopausal[Title]", mulher: "(women[Title] OR woman[Title] OR female[Title])", mulheres: "(women[Title] OR woman[Title] OR female[Title])",
 coronariana: "coronary[Title]", coronariano: "coronary[Title]", dislipidemia: "(dyslipidemia[Title] OR dyslipidaemia[Title])",
 valvopatia: '("heart valve disease"[Title] OR "valvular heart disease"[Title])', endocardite: "endocarditis[Title]", pericardite: "pericarditis[Title]",
 cardiomiopatia: "(cardiomyopathy[Title] OR cardiomyopathies[Title])", aorta: "aortic[Title]",
 hipotireoidismo: "(hypothyroidism[Title] OR hypothyroid[Title])", hipertireoidismo: "(hyperthyroidism[Title] OR hyperthyroid[Title])",
 tireoide: "thyroid[Title]", prediabetes: "prediabetes[Title]", obesidade: "obesity[Title]",
 osteoporose: "osteoporosis[Title]", hipofise: "pituitary[Title]", adrenal: "adrenal[Title]", acromegalia: "acromegaly[Title]",
 prolactina: "prolactin[Title]", cushing: '("Cushing syndrome"[Title] OR "Cushing disease"[Title])',
 infertilidade: "infertility[Title]", hipogonadismo: "hypogonadism[Title]",
 puberdade: "puberty[Title]", crescimento: "growth[Title]", paratireoide: "parathyroid[Title]",
};

export function buildPubmedTextQuery(input: string) {
 const alternatives = input.split(/\s+or\s+/i).map((clause) => buildPubmedAndQuery(clause)).filter(Boolean);
 return alternatives.length > 1 ? alternatives.map((clause) => `(${clause})`).join(" OR ") : alternatives[0] || "";
}

function buildPubmedAndQuery(input: string) {
 let remaining = normalized(input).replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/[-\s]+/g, " ").trim();
 const groups: string[] = [];
 for (const [phrase, query] of titlePhraseQueries) {
  const matcher = new RegExp(`(^|\\s)${phrase}(?=\\s|$)`, "g");
  if (matcher.test(remaining)) {
   groups.push(query);
   remaining = remaining.replace(matcher, " ").replace(/\s+/g, " ").trim();
  }
 }
 const ignored = new Set(["e", "and", "de", "do", "da", "dos", "das", "the", "of"]);
 for (const word of remaining.split(/\s+/).filter(Boolean)) {
  if (ignored.has(word)) continue;
  groups.push(titleWordQueries[word] || `(${word}[Title/Abstract] OR ${word}[MeSH Terms])`);
 }
 return [...new Set(groups)].map((group) => `(${group.replaceAll("[Title]", "[Title/Abstract]")})`).join(" AND ");
}

export function buildPubmedClinicalTerm(specialty: string, topicId: string, input: string) {
 const trimmed = input.trim();
 const pmid = trimmed.match(/^(?:pmid\s*:?\s*)?(\d{1,10})$/i);
 if (pmid) return `${pmid[1]}[PMID]`;
 const doi = trimmed.replace(/^doi\s*:\s*/i, "").match(/^(10\.\d{4,9}\/[\w.()/:;-]+)$/i);
 if (doi) return `"${doi[1]}"[DOI]`;
 const author = trimmed.match(/^(?:autor|author)\s*:\s*([\p{L}\p{N} .'-]{2,80})$/iu);
 const selectedSpecialty = medicalSpecialties.some(([id]) => id === specialty) ? specialty : "";
 const selectedTopic = (specialtyTopicSets[selectedSpecialty] || []).find(([id]) => id === topicId && id !== "all");
 const specialtyConfig = medicalSpecialties.find(([id]) => id === selectedSpecialty);
 const specialtyQuery = selectedSpecialty === "endocrinology"
  ? '("Endocrine System Diseases"[MeSH Terms] OR endocrinology[Title/Abstract] OR endocrine[Title/Abstract] OR diabetes[Title/Abstract] OR obesity[Title/Abstract] OR thyroid[Title/Abstract] OR pituitary[Title/Abstract] OR adrenal[Title/Abstract] OR osteoporosis[Title/Abstract] OR dyslipidemia[Title/Abstract] OR hyperprolactinemia[Title/Abstract])'
  : selectedSpecialty === "cardiology"
   ? '("Cardiovascular Diseases"[MeSH Terms] OR cardiology[Title/Abstract] OR cardiovascular[Title/Abstract] OR cardiac[Title/Abstract])'
   : specialtyConfig
    ? `(${specialtyConfig[2].split(";").map((term) => `"${term}"[Title/Abstract]`).join(" OR ")})`
    : "";
 const terms: string[] = [];
 // A selected clinical theme is already a narrow search. Avoid requiring an
 // additional specialty label that could exclude cross-listed studies.
 if (selectedTopic?.[2]) terms.push(selectedTopic[2]);
 else if (specialtyQuery) terms.push(specialtyQuery);
 const safeAuthor = author?.[1].trim().replace(/\s+/g, " ");
 const words = safeAuthor ? `${safeAuthor}[Author]` : buildPubmedTextQuery(input);
 if (words) terms.push(words);
 return terms.join(" AND ");
}
