--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (84ade85)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: administrations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.administrations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying NOT NULL,
    medicine_id character varying NOT NULL,
    administered_at timestamp without time zone DEFAULT now(),
    status text NOT NULL,
    message text NOT NULL,
    administered_by character varying
);


ALTER TABLE public.administrations OWNER TO neondb_owner;

--
-- Name: assessments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.assessments (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying NOT NULL,
    assessment_type character varying NOT NULL,
    score integer,
    description text,
    findings text,
    assessed_at timestamp without time zone DEFAULT now(),
    assessed_by character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.assessments OWNER TO neondb_owner;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_logs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id character varying NOT NULL,
    action text NOT NULL,
    changes json,
    "timestamp" timestamp without time zone DEFAULT now(),
    user_id character varying
);


ALTER TABLE public.audit_logs OWNER TO neondb_owner;

--
-- Name: care_notes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.care_notes (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying NOT NULL,
    content text NOT NULL,
    category character varying NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.care_notes OWNER TO neondb_owner;

--
-- Name: care_plans; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.care_plans (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying NOT NULL,
    problem text NOT NULL,
    goal text NOT NULL,
    interventions text NOT NULL,
    evaluation text,
    priority character varying NOT NULL,
    status character varying NOT NULL,
    created_by character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.care_plans OWNER TO neondb_owner;

--
-- Name: imaging_files; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.imaging_files (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying NOT NULL,
    study_type character varying NOT NULL,
    study_description text NOT NULL,
    body_part character varying,
    findings text,
    impression text,
    study_date timestamp without time zone NOT NULL,
    reported_by character varying,
    image_url character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.imaging_files OWNER TO neondb_owner;

--
-- Name: intake_output; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.intake_output (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying NOT NULL,
    type character varying NOT NULL,
    category character varying NOT NULL,
    amount integer NOT NULL,
    description text,
    recorded_at timestamp without time zone DEFAULT now(),
    recorded_by character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.intake_output OWNER TO neondb_owner;

--
-- Name: lab_results; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lab_results (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying NOT NULL,
    test_name character varying NOT NULL,
    value character varying NOT NULL,
    unit character varying,
    reference_range character varying,
    status character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    test_code character varying,
    taken_at timestamp without time zone NOT NULL,
    resulted_at timestamp without time zone,
    notes text
);


ALTER TABLE public.lab_results OWNER TO neondb_owner;

--
-- Name: lab_test_types; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lab_test_types (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    code character varying NOT NULL,
    name text NOT NULL,
    category character varying,
    unit character varying,
    reference_range character varying,
    is_active integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lab_test_types OWNER TO neondb_owner;

--
-- Name: medicines; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.medicines (
    id character varying NOT NULL,
    name text NOT NULL,
    drawer text DEFAULT 'A1'::text NOT NULL,
    bin text DEFAULT '01'::text NOT NULL
);


ALTER TABLE public.medicines OWNER TO neondb_owner;

--
-- Name: patients; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.patients (
    id character varying NOT NULL,
    name text NOT NULL,
    dob text NOT NULL,
    age integer NOT NULL,
    dose_weight text NOT NULL,
    sex text NOT NULL,
    mrn text NOT NULL,
    fin text NOT NULL,
    admitted text NOT NULL,
    isolation text NOT NULL,
    bed text NOT NULL,
    allergies text NOT NULL,
    status text NOT NULL,
    provider text NOT NULL,
    notes text NOT NULL,
    department text NOT NULL,
    chart_data json,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.patients OWNER TO neondb_owner;

--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.prescriptions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying NOT NULL,
    medicine_id character varying NOT NULL,
    dosage character varying NOT NULL,
    periodicity character varying NOT NULL,
    duration character varying,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    route character varying DEFAULT 'Oral'::character varying NOT NULL
);


ALTER TABLE public.prescriptions OWNER TO neondb_owner;

--
-- Name: provider_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.provider_orders (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying NOT NULL,
    order_type character varying NOT NULL,
    description text NOT NULL,
    status character varying NOT NULL,
    ordered_by character varying NOT NULL,
    ordered_at timestamp without time zone DEFAULT now(),
    discontinued_at timestamp without time zone,
    discontinued_by character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.provider_orders OWNER TO neondb_owner;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    token character varying NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username character varying NOT NULL,
    pin character varying NOT NULL,
    role character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: vitals; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.vitals (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    patient_id character varying NOT NULL,
    pulse integer NOT NULL,
    temperature character varying NOT NULL,
    respiration_rate integer NOT NULL,
    blood_pressure_systolic integer NOT NULL,
    blood_pressure_diastolic integer NOT NULL,
    oxygen_saturation integer,
    notes text,
    taken_at timestamp without time zone DEFAULT now(),
    taken_by character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.vitals OWNER TO neondb_owner;

--
-- Data for Name: administrations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.administrations (id, patient_id, medicine_id, administered_at, status, message, administered_by) FROM stdin;
\.


--
-- Data for Name: assessments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.assessments (id, patient_id, assessment_type, score, description, findings, assessed_at, assessed_by, created_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_logs (id, entity_type, entity_id, action, changes, "timestamp", user_id) FROM stdin;
6173a991-2d7e-443b-a635-2c9af180fd8f	administration	227de65d-1d43-4383-b6b6-3b7e69c101aa	administer	{"patientId":"112233445566","medicineId":"319084","status":"success","message":"SUCCESS: Administered 'Acetaminophen'.","administeredAt":"2025-08-26T16:15:22.080Z"}	2025-08-26 16:15:22.170125	\N
bdac6751-8610-4407-9162-f0784955b4ec	administration	73214784-7d08-48f9-a3be-3b3ca06c0942	administer	{"patientId":"112233445566","medicineId":"95283134","status":"success","message":"SUCCESS: Administered 'Ibuprofen'.","administeredAt":"2025-08-26T16:17:17.102Z"}	2025-08-26 16:17:17.187818	\N
bcc7c703-b53b-4339-a92c-92353fb116a5	administration	44e5b3f0-f4df-4201-a7aa-ce8ecaf03659	administer	{"patientId":"112233445566","medicineId":"6032924","status":"success","message":"SUCCESS: Administered 'Amoxicillin'.","administeredAt":"2025-08-26T16:22:22.386Z"}	2025-08-26 16:22:22.530589	\N
b78e96cd-9689-454b-a8cc-ea6040e563ae	administration	d595c411-1653-4dbe-8a58-bdf178184ab2	administer	{"patientId":"112233445566","medicineId":"319084","status":"warning","message":"WARNING: 'Acetaminophen' has already been administered.","administeredAt":"2025-08-26T16:22:43.576Z"}	2025-08-26 16:22:43.657457	\N
2f390a87-53c3-4944-9aa7-ce86df3a3a4a	patient	112233445566	update	{"codeStatus":"Full Code","isolation":"None","allergies":"None","status":"Critical","provider":"Place holder","notes":"Place holder"}	2025-08-26 16:23:29.32513	\N
ebcf31dc-d14a-41f8-83ae-6cc0581382d9	administration	f402561f-4fce-44df-88c8-0021b60be257	administer	{"patientId":"223344556677","medicineId":"09509828942","status":"success","message":"SUCCESS: Administered 'Metformin'.","administeredAt":"2025-08-26T16:29:44.744Z"}	2025-08-26 16:29:44.84586	\N
faf3c5ad-6bf7-42da-bf21-727fa83bb060	patient	223344556677	update	{"age":71,"doseWeight":"85 kg","codeStatus":"DNR/DNI","isolation":"Contact Precautions (MRSA)","bed":"ICU-205","allergies":"Penicillin","status":"Improving","provider":"Place holder","notes":"Place holder"}	2025-08-26 16:30:14.480359	\N
2971a513-5a56-4321-bb84-8da8ae413c8e	patient	223344556677	update	{"before":{"id":"223344556677","name":"Benjamin Carter","dob":"1954-11-10","age":70,"doseWeight":"85 kg","sex":"Male","mrn":"Place holder","fin":"Place holder","admitted":"2025-08-20","codeStatus":"DNR/DNI","isolation":"Contact Precautions (MRSA)","bed":"ICU-205","allergies":"Penicillin","status":"Improving","provider":"Place holder","notes":"Place holder","department":"Medical","chartData":{"background":"Place holder","summary":"Place holder","discharge":"Place holder","handoff":"Place holder"},"createdAt":"2025-08-26T16:11:51.454Z"},"after":{"id":"223344556677","name":"Benjamin Carter","dob":"1954-11-10","age":71,"doseWeight":"85 kg","sex":"Male","mrn":"Place holder","fin":"Place holder","admitted":"2025-08-20","codeStatus":"DNR/DNI","isolation":"Contact Precautions (MRSA)","bed":"ICU-205","allergies":"Penicillin","status":"Improving","provider":"Place holder","notes":"Place holder","department":"Medical","chartData":{"background":"Place holder","summary":"Place holder","discharge":"Place holder","handoff":"Place holder"},"createdAt":"2025-08-26T16:11:51.454Z"},"fieldsChanged":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"]}	2025-08-26 16:30:14.555364	\N
79a07f31-f173-4c02-9549-3e91cb6ab2ce	patient	223344556677	update	{"age":71,"doseWeight":"85 kg","codeStatus":"DNR/DNI","isolation":"Contact Precautions (MRSA)","bed":"ICU-205","allergies":"Penicillin","status":"Improving","provider":"Place holder","notes":"Place holder"}	2025-08-26 16:30:26.664201	\N
0fbf0103-04b0-4a32-bb91-3711b5aa6451	patient	223344556677	update	{"before":{"id":"223344556677","name":"Benjamin Carter","dob":"1954-11-10","age":71,"doseWeight":"85 kg","sex":"Male","mrn":"Place holder","fin":"Place holder","admitted":"2025-08-20","codeStatus":"DNR/DNI","isolation":"Contact Precautions (MRSA)","bed":"ICU-205","allergies":"Penicillin","status":"Improving","provider":"Place holder","notes":"Place holder","department":"Medical","chartData":{"background":"Place holder","summary":"Place holder","discharge":"Place holder","handoff":"Place holder"},"createdAt":"2025-08-26T16:11:51.454Z"},"after":{"id":"223344556677","name":"Benjamin Carter","dob":"1954-11-10","age":71,"doseWeight":"85 kg","sex":"Male","mrn":"Place holder","fin":"Place holder","admitted":"2025-08-20","codeStatus":"DNR/DNI","isolation":"Contact Precautions (MRSA)","bed":"ICU-205","allergies":"Penicillin","status":"Improving","provider":"Place holder","notes":"Place holder","department":"Medical","chartData":{"background":"Place holder","summary":"Place holder","discharge":"Place holder","handoff":"Place holder"},"createdAt":"2025-08-26T16:11:51.454Z"},"fieldsChanged":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"]}	2025-08-26 16:30:26.738562	\N
ed65c722-3fa4-4ed9-94af-1380b95d979e	patient	334455667788	update	{"age":31,"doseWeight":"62 kg","codeStatus":"Full Code","isolation":"None","bed":"PP-108","allergies":"Latex, Shellfish, Peanuts","status":"Good","provider":"Place holder","notes":"Place holder"}	2025-08-26 16:41:38.578814	\N
57126dc6-9c8c-4fd7-8c92-e552a1ed46d7	patient	334455667788	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":29,"to":31},"doseWeight":{"from":"62 kg","to":"62 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"PP-108","to":"PP-108"},"allergies":{"from":"Latex, Shellfish","to":"Latex, Shellfish, Peanuts"},"status":{"from":"Good","to":"Good"},"provider":{"from":"Place holder","to":"Place holder"},"notes":{"from":"Place holder","to":"Place holder"}}}	2025-08-26 16:41:38.664343	\N
444c3c60-e71d-4b0e-8f87-a2168b5f35b2	patient	445566778899	update	{"age":0,"doseWeight":"3.2 kg","codeStatus":"Full Code","isolation":"None","bed":"NB-202","allergies":"Peanuts","status":"Healthy","provider":"Place holder","notes":"Place holder"}	2025-08-26 16:45:15.384856	\N
b533c11e-ad86-4695-ab82-5632e71825ff	patient	445566778899	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":0,"to":0},"doseWeight":{"from":"3.2 kg","to":"3.2 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"NB-201","to":"NB-202"},"allergies":{"from":"None known","to":"Peanuts"},"status":{"from":"Healthy","to":"Healthy"},"provider":{"from":"Place holder","to":"Place holder"},"notes":{"from":"Place holder","to":"Place holder"}}}	2025-08-26 16:45:15.469245	\N
72515dec-8a1e-440e-9c2b-a5102b364bfa	prescription	1	delete	{"patient_id":"112233445566","prescription_id":"1","action":"prescription_removed"}	2025-08-26 17:53:15.921891	\N
2d4aeb83-b29c-44f7-b10b-a438a8197e55	prescription	d2a7719a-90a1-4e30-80d1-cbaebd7bc4c3	create	{"patientId":"112233445566","medicineId":"319084"}	2025-08-26 17:53:35.41877	\N
d63787f0-0398-42cf-a8ef-77d85a60af3b	prescription	d2a7719a-90a1-4e30-80d1-cbaebd7bc4c3	create	{"patient_id":"112233445566","medicine_id":"319084","action":"prescription_added"}	2025-08-26 17:53:35.494376	\N
2bfe0092-b110-4b70-ac7f-2342511efb72	prescription	1	delete	{"patient_id":"112233445566","prescription_id":"1","action":"prescription_removed"}	2025-08-26 18:02:00.76686	\N
bb089e10-53bb-474f-bf22-5293922d31e6	prescription	b604d6c3-4d16-4931-8bf0-0dfba551b48b	create	{"patientId":"112233445566","medicineId":"319084","dosage":"10mg","periodicity":"Every 6 hours"}	2025-08-26 18:02:21.586941	\N
e83583ad-e724-4fb8-ae85-e0a403115094	prescription	b604d6c3-4d16-4931-8bf0-0dfba551b48b	create	{"patient_id":"112233445566","medicine_id":"319084","action":"prescription_added"}	2025-08-26 18:02:21.663237	\N
f5874b4f-e6ed-4583-9a21-6a169ad7a8b5	prescription	b604d6c3-4d16-4931-8bf0-0dfba551b48b	delete	{"patient_id":"112233445566","prescription_id":"b604d6c3-4d16-4931-8bf0-0dfba551b48b","action":"prescription_removed"}	2025-08-26 18:07:39.464068	\N
89454423-70aa-4136-af3e-81ed577601f9	prescription	1	update	{"dosage":"500mg","periodicity":"Every 6 hours","duration":"7 days"}	2025-08-26 18:35:59.005083	\N
70677629-0c85-4e49-bec9-e312b72db291	prescription	1	update	{"patient_id":"112233445566","prescription_id":"1","updates":{"dosage":"500mg","periodicity":"Every 6 hours","duration":"7 days"},"action":"prescription_updated"}	2025-08-26 18:35:59.086966	\N
0953d7a2-abdc-4835-bf81-b2fed10026d3	prescription	2	update	{"dosage":"25mg","periodicity":"Once daily","duration":"2 weeks","startDate":"2025-08-26T00:00:00.000Z","endDate":"2025-08-29T00:00:00.000Z"}	2025-08-26 18:39:59.103475	\N
ab75b281-9560-4aea-8e53-ea3eebf448b0	prescription	2	update	{"patient_id":"112233445566","prescription_id":"2","updates":{"dosage":"25mg","periodicity":"Once daily","duration":"2 weeks","startDate":"2025-08-26T00:00:00.000Z","endDate":"2025-08-29T00:00:00.000Z"},"action":"prescription_updated"}	2025-08-26 18:39:59.179117	\N
32227d90-9d8e-443a-8d84-0df47b6f34f6	prescription	2	update	{"dosage":"25mg","periodicity":"Once daily","duration":"2 weeks","startDate":null,"endDate":null}	2025-08-26 18:40:28.571175	\N
4011c185-d019-4cc6-956b-bbc80d0b0b25	prescription	2	update	{"patient_id":"112233445566","prescription_id":"2","updates":{"dosage":"25mg","periodicity":"Once daily","duration":"2 weeks","startDate":null,"endDate":null},"action":"prescription_updated"}	2025-08-26 18:40:28.644	\N
d8563eec-d0e0-49b2-a976-cd2d77303ae7	patient	223344556677	delete	{"patient_id":"223344556677","patient_name":"Benjamin Carter","action":"patient_deleted"}	2025-08-26 19:21:10.033399	\N
34f1e785-7ca7-4987-81dc-c260b7d34b78	prescription	19d4b82f-5d61-4acc-b639-b430e63ffc72	create	{"patientId":"112233445566","medicineId":"31908432","dosage":"10mg","periodicity":"Every 4 hours","duration":"3 days","route":"Oral","startDate":"2025-08-26T00:00:00.000Z","endDate":"2025-08-28T00:00:00.000Z"}	2025-08-26 22:11:04.258568	\N
8a2b3570-ff66-4387-aaf8-8010fda97218	prescription	19d4b82f-5d61-4acc-b639-b430e63ffc72	create	{"patient_id":"112233445566","medicine_id":"31908432","action":"prescription_added"}	2025-08-26 22:11:04.337305	\N
5007fd82-3acd-403d-a271-77053748bd55	administration	c8ab0231-84bf-4fd8-9b37-20d3ed8db210	administer	{"patientId":"112233445566","medicineId":"31908432","status":"success","message":"SUCCESS: Administered 'Acetaminophen'.","administeredAt":"2025-08-26T22:11:16.578Z"}	2025-08-26 22:11:16.658749	\N
493f3961-907c-480d-9a51-4a890b0f80e3	administration	386749d5-6d97-4658-adae-0a3cdb6e7985	administer	{"patientId":"112233445566","medicineId":"09509828","status":"error","message":"DANGER: Administered 'Metformin' - NOT prescribed for this patient.","administeredAt":"2025-08-26T22:58:40.230Z"}	2025-08-26 22:58:40.320017	\N
322e36d0-884d-4574-8333-c03d9194a08f	administration	06f15846-a286-4b3e-b327-6defbb73ea0b	administer	{"patientId":"112233445566","medicineId":"09509828","status":"error","message":"DANGER: Administered 'Metformin' - NOT prescribed for this patient.","administeredAt":"2025-08-26T22:58:56.608Z"}	2025-08-26 22:58:56.687202	\N
61f9293d-df68-4faa-a859-b969df74429f	administration	fbe0c336-1286-4424-b781-516e23fcc427	administer	{"patientId":"112233445566","medicineId":"31908432","status":"success","message":"SUCCESS: Administered 'Acetaminophen'.","administeredAt":"2025-08-27T11:21:38.864Z"}	2025-08-27 11:21:38.953653	\N
2fdce6d4-818e-4053-a014-678c01ef6baa	administration	fbe0c336-1286-4424-b781-516e23fcc427	administer	{"medicationAdministered":true,"patientId":"112233445566","medicineId":"31908432","status":"success","administeredBy":"a"}	2025-08-27 11:21:39.04564	bed4e3e3-865a-4661-a920-abdc011e013b
381bea61-9b70-41f7-931c-c534ab1f2f5c	administration	c9a2a0fd-538f-481a-b24b-7d11f7497b98	administer	{"patientId":"112233445566","medicineId":"31908432","status":"success","message":"SUCCESS: Administered 'Acetaminophen' by a.","administeredAt":"2025-08-27T11:25:42.342Z"}	2025-08-27 11:25:42.432006	\N
41252def-33dd-4030-984c-b857cfa5fb55	administration	c9a2a0fd-538f-481a-b24b-7d11f7497b98	administer	{"medicationAdministered":true,"patientId":"112233445566","medicineId":"31908432","status":"success","administeredBy":"a"}	2025-08-27 11:25:42.512211	bed4e3e3-865a-4661-a920-abdc011e013b
d11a23af-71f2-4b61-ae70-72eb62565aab	prescription	acf6e80a-1ec4-42e5-b45f-8540c379fe70	create	{"patientId":"112233445566","medicineId":"09509828","dosage":"2 tabs","periodicity":"Once daily","duration":"7 days","route":"Oral","startDate":"2025-08-27T00:00:00.000Z","endDate":"2025-09-02T00:00:00.000Z"}	2025-08-27 11:27:57.477541	\N
911872c4-fb9e-48b8-8189-666daa8f9e64	prescription	acf6e80a-1ec4-42e5-b45f-8540c379fe70	create	{"patient_id":"112233445566","medicine_id":"09509828","action":"prescription_added"}	2025-08-27 11:27:57.552151	\N
f55919f0-d474-4ec4-8bea-088e39d87892	administration	3476e0fc-7a5f-4e76-9e85-be57343781fb	administer	{"patientId":"112233445566","medicineId":"09509828","status":"success","message":"SUCCESS: Administered 'Metformin'.","administeredAt":"2025-08-27T11:28:42.292Z"}	2025-08-27 11:28:42.36674	\N
e46047a7-0e0e-479e-86ef-b5560ad98bbd	administration	3476e0fc-7a5f-4e76-9e85-be57343781fb	administer	{"medicationAdministered":true,"patientId":"112233445566","medicineId":"09509828","status":"success","administeredBy":"a"}	2025-08-27 11:28:42.466341	bed4e3e3-865a-4661-a920-abdc011e013b
7e4aa8dd-0eb9-433f-97c9-32a94b894a7e	administration	e8bbab7b-5cdb-4849-b534-18b1304a1dac	administer	{"patientId":"112233445566","medicineId":"31908432","status":"success","message":"SUCCESS: Administered 'Acetaminophen'.","administeredAt":"2025-08-27T11:29:36.827Z"}	2025-08-27 11:29:36.906744	\N
6607a04f-f586-49b6-a161-ed7f818f8d77	administration	e8bbab7b-5cdb-4849-b534-18b1304a1dac	administer	{"medicationAdministered":true,"patientId":"112233445566","medicineId":"31908432","status":"success","administeredBy":"a"}	2025-08-27 11:29:36.980133	bed4e3e3-865a-4661-a920-abdc011e013b
40384196-ce91-48f9-b57f-f84ca9fd80df	prescription	053018a8-d9f2-40a9-a2bb-4a7a4c999a1c	create	{"patientId":"112233445566","medicineId":"10000009","dosage":"2 tabs","periodicity":"As needed","duration":"7 days","route":"Oral","startDate":"2025-08-27T00:00:00.000Z","endDate":"2025-09-02T00:00:00.000Z"}	2025-08-27 12:31:07.622425	\N
0e3e68f6-6d09-4a9d-90b7-a4ca88bd9477	prescription	053018a8-d9f2-40a9-a2bb-4a7a4c999a1c	create	{"patient_id":"112233445566","medicine_id":"10000009","action":"prescription_added"}	2025-08-27 12:31:07.700998	\N
a909330b-cf43-4a22-b375-b822021f02fa	prescription	c44a3086-4435-4f61-b253-76778549323e	create	{"patientId":"112233445566","medicineId":"20000004","dosage":"2 tabs","periodicity":"Every 6 hours","duration":"2 weeks","route":"Oral","startDate":"2025-08-27T00:00:00.000Z","endDate":"2025-09-09T00:00:00.000Z"}	2025-08-27 12:31:48.557304	\N
33b79528-7c3f-4c96-8b7d-cf5f029ebdb2	prescription	c44a3086-4435-4f61-b253-76778549323e	create	{"patient_id":"112233445566","medicine_id":"20000004","action":"prescription_added"}	2025-08-27 12:31:48.634004	\N
4b5ab770-cfa2-419a-b183-9b6f2c44b522	administration	d3702cf7-43f2-4f3b-9a5f-3e82b997536c	administer	{"patientId":"112233445566","medicineId":"20000004","status":"success","message":"MedPyxis: Collected 'Ibuprofen 200 mg' from Drawer 2, Bin 4","administeredAt":"2025-08-27T12:37:29.494Z"}	2025-08-27 12:37:29.585352	\N
0382f943-fe46-4b9a-afa2-7be243b08193	administration	d3702cf7-43f2-4f3b-9a5f-3e82b997536c	administer	{"medicationAdministered":true,"patientId":"112233445566","medicineId":"20000004","status":"success","administeredBy":"a"}	2025-08-27 12:37:29.664064	bed4e3e3-865a-4661-a920-abdc011e013b
46c1af34-9037-48c1-8711-3f0c61838ef6	administration	7cd2b4a7-c9d2-4783-9fc3-ea3971f1baeb	administer	{"patientId":"112233445566","medicineId":"10000009","status":"success","message":"SUCCESS: Administered 'Acetaminophen 325 mg'.","administeredAt":"2025-08-27T12:40:37.264Z"}	2025-08-27 12:40:37.34524	\N
d89095fa-e25b-488a-ab31-ba7149babe62	administration	7cd2b4a7-c9d2-4783-9fc3-ea3971f1baeb	administer	{"medicationAdministered":true,"patientId":"112233445566","medicineId":"10000009","status":"success","administeredBy":"a"}	2025-08-27 12:40:37.423368	bed4e3e3-865a-4661-a920-abdc011e013b
25f35afe-5467-4661-8311-213bf0b082b7	administration	36fa2304-f1d1-4fb3-a95d-276e60ddeed4	administer	{"patientId":"112233445566","medicineId":"20000004","status":"success","message":"MedPyxis: Collected 'Ibuprofen 200 mg' from Drawer 2, Bin 4","administeredAt":"2025-08-27T12:41:50.345Z"}	2025-08-27 12:41:50.42246	\N
30ed761e-ed92-44b3-8a10-e88c0ba92f7a	administration	36fa2304-f1d1-4fb3-a95d-276e60ddeed4	administer	{"medicationAdministered":true,"patientId":"112233445566","medicineId":"20000004","status":"success","administeredBy":"a"}	2025-08-27 12:41:50.493084	bed4e3e3-865a-4661-a920-abdc011e013b
728e2168-95ac-45ff-9b85-3df8423b9e22	prescription	c44a3086-4435-4f61-b253-76778549323e	update	{"dosage":"2 tabs","periodicity":"Every 8 hours","duration":"2 weeks","route":"Oral","startDate":"2025-08-27T00:00:00.000Z","endDate":"2025-09-09T00:00:00.000Z"}	2025-08-27 12:49:56.405608	\N
40406f25-cc72-4e1c-b273-171e5cc8a657	prescription	c44a3086-4435-4f61-b253-76778549323e	update	{"patient_id":"112233445566","prescription_id":"c44a3086-4435-4f61-b253-76778549323e","updates":{"dosage":"2 tabs","periodicity":"Every 8 hours","duration":"2 weeks","route":"Oral","startDate":"2025-08-27T00:00:00.000Z","endDate":"2025-09-09T00:00:00.000Z"},"action":"prescription_updated"}	2025-08-27 12:49:56.492199	\N
88f930c0-8a35-409f-adf0-ab4ef872d6b3	patient	112233445566	update	{"age":31,"doseWeight":"68 kg","codeStatus":"Full Code","isolation":"None","bed":"LD-102","allergies":"None","status":"Stable","provider":"Place holder","notes":"Place holder"}	2025-08-27 13:21:22.538815	642ff1ea-3e74-417e-815b-c69b63b3e5f6
d5e1b67c-c104-499f-af52-3e8f4c234ffd	patient	112233445566	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":37,"to":31},"doseWeight":{"from":"68 kg","to":"68 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"LD-102","to":"LD-102"},"allergies":{"from":"None","to":"None"},"status":{"from":"Stable","to":"Stable"},"provider":{"from":"Place holder","to":"Place holder"},"notes":{"from":"Place holder","to":"Place holder"}},"updatedBy":"student1"}	2025-08-27 13:21:22.616772	642ff1ea-3e74-417e-815b-c69b63b3e5f6
fb498db7-4e4e-4819-92d6-5c7dc182962b	patient	112233445566	update	{"age":31,"doseWeight":"68 kg","codeStatus":"Full Code","isolation":"None","bed":"LD-102","allergies":"None","status":"Stable","provider":"Place holder","notes":"Place holder"}	2025-08-27 13:21:29.890573	642ff1ea-3e74-417e-815b-c69b63b3e5f6
c7ac9773-9538-4189-a52c-57f6a36b7eee	patient	112233445566	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":31,"to":31},"doseWeight":{"from":"68 kg","to":"68 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"LD-102","to":"LD-102"},"allergies":{"from":"None","to":"None"},"status":{"from":"Stable","to":"Stable"},"provider":{"from":"Place holder","to":"Place holder"},"notes":{"from":"Place holder","to":"Place holder"}},"updatedBy":"student1"}	2025-08-27 13:21:29.961668	642ff1ea-3e74-417e-815b-c69b63b3e5f6
14286b03-2f6a-4ba1-9e6a-0da71b8c531c	patient	112233445566	update	{"age":27,"doseWeight":"68 kg","codeStatus":"Full Code","isolation":"None","bed":"LD-102","allergies":"None","status":"Stable","provider":"Place holder","notes":"Place holder"}	2025-08-27 13:27:40.970473	a1ae595d-4182-4fc8-825b-d905334a4158
ec8b8d2b-86c5-4d60-9f28-45c826bde718	patient	112233445566	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":31,"to":27},"doseWeight":{"from":"68 kg","to":"68 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"LD-102","to":"LD-102"},"allergies":{"from":"None","to":"None"},"status":{"from":"Stable","to":"Stable"},"provider":{"from":"Place holder","to":"Place holder"},"notes":{"from":"Place holder","to":"Place holder"}},"updatedBy":"instructor"}	2025-08-27 13:27:41.042648	a1ae595d-4182-4fc8-825b-d905334a4158
5af80960-d611-4421-9978-099527428763	patient	112233445566	update	{"age":29,"doseWeight":"68 kg","codeStatus":"Full Code","isolation":"None","bed":"LD-102","allergies":"None","status":"Stable","provider":"Place holder","notes":"Place holder"}	2025-08-27 13:32:17.117607	bed4e3e3-865a-4661-a920-abdc011e013b
91599702-29eb-46c7-8c23-1fe1daf46f2e	patient	112233445566	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":27,"to":29},"doseWeight":{"from":"68 kg","to":"68 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"LD-102","to":"LD-102"},"allergies":{"from":"None","to":"None"},"status":{"from":"Stable","to":"Stable"},"provider":{"from":"Place holder","to":"Place holder"},"notes":{"from":"Place holder","to":"Place holder"}},"updatedBy":"a"}	2025-08-27 13:32:17.196501	bed4e3e3-865a-4661-a920-abdc011e013b
27451657-821e-4a25-982c-c01979dab3eb	vitals	4df466c9-5dce-400c-a8ea-fb3ed1a67305	create	{"vitalsRecorded":true,"recordedBy":"a","patientId":"112233445566","pulse":77,"temperature":"99.1","respirationRate":17,"bloodPressure":"120/80"}	2025-08-27 13:32:51.769776	bed4e3e3-865a-4661-a920-abdc011e013b
c78eba5b-2463-4c3a-8ffa-54689001b350	vitals	640565e2-0cbd-4481-b33e-3c9580cdb294	create	{"vitalsRecorded":true,"recordedBy":"a","patientId":"112233445566","pulse":77,"temperature":"99.1","respirationRate":17,"bloodPressure":"120/80"}	2025-08-27 13:33:01.970422	bed4e3e3-865a-4661-a920-abdc011e013b
52dab771-31cd-429e-8a97-b3f214cf2cea	patient	112233445566	update	{"age":27,"doseWeight":"68 kg","codeStatus":"Full Code","isolation":"None","bed":"LD-102","allergies":"None","status":"Stable","provider":"Place holder","notes":"Place holder"}	2025-08-27 13:35:07.55582	bed4e3e3-865a-4661-a920-abdc011e013b
ce2f512b-c973-4c35-a91b-62613eaa01ed	patient	112233445566	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":29,"to":27},"doseWeight":{"from":"68 kg","to":"68 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"LD-102","to":"LD-102"},"allergies":{"from":"None","to":"None"},"status":{"from":"Stable","to":"Stable"},"provider":{"from":"Place holder","to":"Place holder"},"notes":{"from":"Place holder","to":"Place holder"}},"updatedBy":"a"}	2025-08-27 13:35:07.628347	bed4e3e3-865a-4661-a920-abdc011e013b
1f4a447f-7d43-4fcc-9206-006c9d977431	patient	334455667788	update	{"age":31,"doseWeight":"68 kg","codeStatus":"Full Code","isolation":"None","bed":"OR-3","allergies":"None","status":"Pre-operative","provider":"Dr. Kim","notes":"ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\\n\\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\\n\\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+."}	2025-08-27 15:25:44.393895	bed4e3e3-865a-4661-a920-abdc011e013b
bd3b5e26-11c3-4115-925e-037a66d3b561	patient	334455667788	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":31,"to":31},"doseWeight":{"from":"68 kg","to":"68 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"OR-3","to":"OR-3"},"allergies":{"from":"No Known Allergies (NKA)","to":"None"},"status":{"from":"Pre-operative","to":"Pre-operative"},"provider":{"from":"Dr. Kim","to":"Dr. Kim"},"notes":{"from":"ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\\n\\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\\n\\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+.","to":"ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\\n\\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\\n\\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+."}},"updatedBy":"a"}	2025-08-27 15:25:44.47462	bed4e3e3-865a-4661-a920-abdc011e013b
384323fa-633c-41aa-b842-7de25a17648e	patient	112233445566	update	{"age":28,"doseWeight":"65 kg","codeStatus":"Full Code","isolation":"None","bed":"LD-102","allergies":"None","status":"Active Labor","provider":"Dr. Martinez","notes":"ADMISSION: 08/27/2025 @ 06:30 for spontaneous rupture of membranes (SROM) with clear fluid, active labor.\\n\\nLABOR STATUS: G1 P0, 39 weeks 4 days gestation. Cervix 4 cm dilated, 90% effaced, -1 station. Membranes ruptured. Contractions every 3-4 minutes, lasting 60 seconds, moderate intensity.\\n\\nMEDICAL HISTORY: Uncomplicated prenatal course. GBS negative. Blood Type: O+."}	2025-08-27 15:26:21.080718	bed4e3e3-865a-4661-a920-abdc011e013b
71f49392-e3a1-45c9-bd87-903f31935f88	patient	112233445566	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":28,"to":28},"doseWeight":{"from":"65 kg","to":"65 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"LD-102","to":"LD-102"},"allergies":{"from":"No Known Allergies (NKA)","to":"None"},"status":{"from":"Active Labor","to":"Active Labor"},"provider":{"from":"Dr. Martinez","to":"Dr. Martinez"},"notes":{"from":"ADMISSION: 08/27/2025 @ 06:30 for spontaneous rupture of membranes (SROM) with clear fluid, active labor.\\n\\nLABOR STATUS: G1 P0, 39 weeks 4 days gestation. Cervix 4 cm dilated, 90% effaced, -1 station. Membranes ruptured. Contractions every 3-4 minutes, lasting 60 seconds, moderate intensity.\\n\\nMEDICAL HISTORY: Uncomplicated prenatal course. GBS negative. Blood Type: O+.","to":"ADMISSION: 08/27/2025 @ 06:30 for spontaneous rupture of membranes (SROM) with clear fluid, active labor.\\n\\nLABOR STATUS: G1 P0, 39 weeks 4 days gestation. Cervix 4 cm dilated, 90% effaced, -1 station. Membranes ruptured. Contractions every 3-4 minutes, lasting 60 seconds, moderate intensity.\\n\\nMEDICAL HISTORY: Uncomplicated prenatal course. GBS negative. Blood Type: O+."}},"updatedBy":"a"}	2025-08-27 15:26:21.153493	bed4e3e3-865a-4661-a920-abdc011e013b
6fc1c4eb-5408-4d3b-872b-0ca064f9a2a0	patient	445566778899	update	{"age":24,"doseWeight":"58 kg","codeStatus":"Full Code","isolation":"None","bed":"LD-106","allergies":"None","status":"Preterm Labor","provider":"Dr. Johnson","notes":"ADMISSION: 08/27/2025 @ 02:15 for reports of regular, painful contractions.\\n\\nLABOR STATUS: G2 P1, 33 weeks 2 days gestation. Cervix 2 cm dilated, 75% effaced, -2 station. Membranes intact. Contractions every 5-7 minutes, lasting 45 seconds.\\n\\nMEDICAL HISTORY: Previous preterm delivery at 35 weeks. Blood Type: AB+."}	2025-08-27 15:26:47.41847	bed4e3e3-865a-4661-a920-abdc011e013b
df3252ca-168d-4b6e-8cb8-72c2cd25de39	patient	445566778899	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":24,"to":24},"doseWeight":{"from":"58 kg","to":"58 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"LD-106","to":"LD-106"},"allergies":{"from":"No Known Allergies (NKA)","to":"None"},"status":{"from":"Preterm Labor","to":"Preterm Labor"},"provider":{"from":"Dr. Johnson","to":"Dr. Johnson"},"notes":{"from":"ADMISSION: 08/27/2025 @ 02:15 for reports of regular, painful contractions.\\n\\nLABOR STATUS: G2 P1, 33 weeks 2 days gestation. Cervix 2 cm dilated, 75% effaced, -2 station. Membranes intact. Contractions every 5-7 minutes, lasting 45 seconds.\\n\\nMEDICAL HISTORY: Previous preterm delivery at 35 weeks. Blood Type: AB+.","to":"ADMISSION: 08/27/2025 @ 02:15 for reports of regular, painful contractions.\\n\\nLABOR STATUS: G2 P1, 33 weeks 2 days gestation. Cervix 2 cm dilated, 75% effaced, -2 station. Membranes intact. Contractions every 5-7 minutes, lasting 45 seconds.\\n\\nMEDICAL HISTORY: Previous preterm delivery at 35 weeks. Blood Type: AB+."}},"updatedBy":"a"}	2025-08-27 15:26:47.490872	bed4e3e3-865a-4661-a920-abdc011e013b
e38e44a3-0712-48e6-8df1-e1ba1e730f5b	patient	334455667788	update	{"age":31,"doseWeight":"68 kg","codeStatus":"Full Code","isolation":"None","bed":"OR-3","allergies":"None","status":"Pre-operative","provider":"Dr. Kim","notes":"ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+."}	2025-08-27 15:34:01.603922	bed4e3e3-865a-4661-a920-abdc011e013b
fea7fb9f-b016-44fb-b9fa-ce05e6bea84b	patient	334455667788	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":31,"to":31},"doseWeight":{"from":"68 kg","to":"68 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"OR-3","to":"OR-3"},"allergies":{"from":"None","to":"None"},"status":{"from":"Pre-operative","to":"Pre-operative"},"provider":{"from":"Dr. Kim","to":"Dr. Kim"},"notes":{"from":"ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\\n\\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\\n\\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+.","to":"ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+."}},"updatedBy":"a"}	2025-08-27 15:34:01.684614	bed4e3e3-865a-4661-a920-abdc011e013b
33c36aea-4da9-4e45-8368-42fab02a31b3	patient	789123456789	update	{"age":0,"doseWeight":"3.4 kg","codeStatus":"Full Code","isolation":"None","bed":"NICU-201","allergies":"None","status":"Stable","provider":"Dr. Martinez","notes":"BIRTH: 08/27/2025 @ 10:52, Spontaneous Vaginal Delivery\\n\\nPARENT: Olivia Smith (MRN: MN-456789123)\\n\\nGESTATION: 39 weeks 4 days\\n\\nBIRTH DETAILS: Birth Weight 3.4 kg (7 lbs 8 oz), Length 51 cm. APGAR Scores: 8 (1 min), 9 (5 min)\\n\\nVITALS: T: 37.0°C, HR: 145, RR: 50\\n\\nCARE PLAN: Breastfeeding on demand, routine newborn care"}	2025-08-27 15:34:36.566294	bed4e3e3-865a-4661-a920-abdc011e013b
4998b52b-ff7a-4a32-87a1-7734ee697f8a	patient	789123456789	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":0,"to":0},"doseWeight":{"from":"3.4 kg","to":"3.4 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"NICU-201","to":"NICU-201"},"allergies":{"from":"No Known Allergies (NKA)","to":"None"},"status":{"from":"Stable","to":"Stable"},"provider":{"from":"Dr. Martinez","to":"Dr. Martinez"},"notes":{"from":"BIRTH: 08/27/2025 @ 10:52, Spontaneous Vaginal Delivery\\n\\nPARENT: Olivia Smith (MRN: MN-456789123)\\n\\nGESTATION: 39 weeks 4 days\\n\\nBIRTH DETAILS: Birth Weight 3.4 kg (7 lbs 8 oz), Length 51 cm. APGAR Scores: 8 (1 min), 9 (5 min)\\n\\nVITALS: T: 37.0°C, HR: 145, RR: 50\\n\\nCARE PLAN: Breastfeeding on demand, routine newborn care","to":"BIRTH: 08/27/2025 @ 10:52, Spontaneous Vaginal Delivery\\n\\nPARENT: Olivia Smith (MRN: MN-456789123)\\n\\nGESTATION: 39 weeks 4 days\\n\\nBIRTH DETAILS: Birth Weight 3.4 kg (7 lbs 8 oz), Length 51 cm. APGAR Scores: 8 (1 min), 9 (5 min)\\n\\nVITALS: T: 37.0°C, HR: 145, RR: 50\\n\\nCARE PLAN: Breastfeeding on demand, routine newborn care"}},"updatedBy":"a"}	2025-08-27 15:34:36.648206	bed4e3e3-865a-4661-a920-abdc011e013b
b10e8328-bda8-4a29-9fbf-821a591b447a	patient	901345678901	update	{"age":0,"doseWeight":"2.6 kg","codeStatus":"Full Code","isolation":"None","bed":"NICU-301","allergies":"None ","status":"NICU Care","provider":"Dr. Kim","notes":"BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\\nPARENT: Emily Chen (MRN: MN-123456789)\\nGESTATION: 37 weeks 5 days (late preterm)\\n\\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)\\n\\nVITALS: T: 36.6°C, HR: 155, RR: 58\\n\\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother's expressed colostrum via syringe, then breast/bottle as tolerated"}	2025-08-27 15:34:57.766446	bed4e3e3-865a-4661-a920-abdc011e013b
2f0864ee-ad1e-4838-abff-57ddd74c3548	patient	901345678901	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":0,"to":0},"doseWeight":{"from":"2.6 kg","to":"2.6 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"NICU-301","to":"NICU-301"},"allergies":{"from":"No Known Allergies (NKA)","to":"None "},"status":{"from":"NICU Care","to":"NICU Care"},"provider":{"from":"Dr. Kim","to":"Dr. Kim"},"notes":{"from":"BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\\n\\nPARENT: Emily Chen (MRN: MN-123456789)\\n\\nGESTATION: 37 weeks 5 days (late preterm)\\n\\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)\\n\\nVITALS: T: 36.6°C, HR: 155, RR: 58\\n\\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother's expressed colostrum via syringe, then breast/bottle as tolerated","to":"BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\\nPARENT: Emily Chen (MRN: MN-123456789)\\nGESTATION: 37 weeks 5 days (late preterm)\\n\\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)\\n\\nVITALS: T: 36.6°C, HR: 155, RR: 58\\n\\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother's expressed colostrum via syringe, then breast/bottle as tolerated"}},"updatedBy":"a"}	2025-08-27 15:34:57.841822	bed4e3e3-865a-4661-a920-abdc011e013b
c1f3d5eb-0a2b-4dff-aaa2-8bdf3bd76c2c	patient	901345678901	update	{"age":0,"doseWeight":"2.6 kg","codeStatus":"Full Code","isolation":"None","bed":"NICU-301","allergies":"None","status":"NICU Care","provider":"Dr. Kim","notes":"BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\\nPARENT: Emily Chen (MRN: MN-123456789)\\nGESTATION: 37 weeks 5 days (late preterm)\\n\\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)\\n\\nVITALS: T: 36.6°C, HR: 155, RR: 58\\n\\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother's expressed colostrum via syringe, then breast/bottle as tolerated"}	2025-08-27 15:35:16.287962	bed4e3e3-865a-4661-a920-abdc011e013b
8a07a491-d36b-4223-8075-77f21e7cb99f	patient	901345678901	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":0,"to":0},"doseWeight":{"from":"2.6 kg","to":"2.6 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"NICU-301","to":"NICU-301"},"allergies":{"from":"None ","to":"None"},"status":{"from":"NICU Care","to":"NICU Care"},"provider":{"from":"Dr. Kim","to":"Dr. Kim"},"notes":{"from":"BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\\nPARENT: Emily Chen (MRN: MN-123456789)\\nGESTATION: 37 weeks 5 days (late preterm)\\n\\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)\\n\\nVITALS: T: 36.6°C, HR: 155, RR: 58\\n\\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother's expressed colostrum via syringe, then breast/bottle as tolerated","to":"BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\\nPARENT: Emily Chen (MRN: MN-123456789)\\nGESTATION: 37 weeks 5 days (late preterm)\\n\\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)\\n\\nVITALS: T: 36.6°C, HR: 155, RR: 58\\n\\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother's expressed colostrum via syringe, then breast/bottle as tolerated"}},"updatedBy":"a"}	2025-08-27 15:35:16.363334	bed4e3e3-865a-4661-a920-abdc011e013b
fc41231c-9c58-490e-8d78-bb746a6faa71	patient	012456789012	update	{"age":0,"doseWeight":"2.8 kg","codeStatus":"Full Code","isolation":"None","bed":"NICU-302","allergies":"None","status":"NICU Care","provider":"Dr. Kim","notes":"BIRTH: 08/27/2025 @ 09:44, Scheduled Cesarean Section (Twin B)\\nPARENT: Emily Chen (MRN: MN-123456789)\\nGESTATION: 37 weeks 5 days (late preterm)\\nBIRTH DETAILS: Birth Weight 2.8 kg (6 lbs 3 oz), Length 48 cm. APGAR Scores: 8 (1 min), 9 (5 min)\\nVITALS: T: 36.7°C, HR: 148, RR: 54\\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother's expressed colostrum via syringe, then breast/bottle as tolerated"}	2025-08-27 15:35:44.677752	bed4e3e3-865a-4661-a920-abdc011e013b
29232a64-9645-4206-97ff-71813365f871	patient	667788990011	update	{"age":32,"doseWeight":"64 kg","codeStatus":"Full Code","isolation":"None","bed":"LD-110","allergies":"Sulfa drugs (hives)","status":"TOLAC","provider":"Dr. Anderson","notes":"ADMISSION: 08/27/2025 @ 11:15 for spontaneous active labor, desires Trial of Labor After Cesarean (TOLAC).; LABOR STATUS: G2 P1, 40 weeks 2 days gestation. Cervix 5 cm dilated, 100% effaced, 0 station. Membranes intact. Contractions every 3 minutes, lasting 60-70 seconds, strong intensity.; MEDICAL HISTORY: One previous C-section for fetal distress. Confirmed low transverse uterine incision. Blood Type: A+."}	2025-08-27 15:41:40.85622	bed4e3e3-865a-4661-a920-abdc011e013b
e0ad826d-77c4-402e-bfa5-66979b3e78ee	patient	012456789012	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":0,"to":0},"doseWeight":{"from":"2.8 kg","to":"2.8 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"NICU-302","to":"NICU-302"},"allergies":{"from":"No Known Allergies (NKA)","to":"None"},"status":{"from":"NICU Care","to":"NICU Care"},"provider":{"from":"Dr. Kim","to":"Dr. Kim"},"notes":{"from":"BIRTH: 08/27/2025 @ 09:44, Scheduled Cesarean Section (Twin B)\\n\\nPARENT: Emily Chen (MRN: MN-123456789)\\n\\nGESTATION: 37 weeks 5 days (late preterm)\\n\\nBIRTH DETAILS: Birth Weight 2.8 kg (6 lbs 3 oz), Length 48 cm. APGAR Scores: 8 (1 min), 9 (5 min)\\n\\nVITALS: T: 36.7°C, HR: 148, RR: 54\\n\\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother's expressed colostrum via syringe, then breast/bottle as tolerated","to":"BIRTH: 08/27/2025 @ 09:44, Scheduled Cesarean Section (Twin B)\\nPARENT: Emily Chen (MRN: MN-123456789)\\nGESTATION: 37 weeks 5 days (late preterm)\\nBIRTH DETAILS: Birth Weight 2.8 kg (6 lbs 3 oz), Length 48 cm. APGAR Scores: 8 (1 min), 9 (5 min)\\nVITALS: T: 36.7°C, HR: 148, RR: 54\\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother's expressed colostrum via syringe, then breast/bottle as tolerated"}},"updatedBy":"a"}	2025-08-27 15:35:44.755085	bed4e3e3-865a-4661-a920-abdc011e013b
cbe8bb2a-c38c-4fac-95d8-df4d3b0f39b1	patient	012456789012	update	{"age":0,"doseWeight":"2.8 kg","codeStatus":"Full Code","isolation":"None","bed":"NICU-302","allergies":"None","status":"NICU Care","provider":"Dr. Kim","notes":"BIRTH: 08/27/2025 @ 09:44, Scheduled Cesarean Section (Twin B)\\nGESTATION: 37 weeks 5 days (late preterm)\\nBIRTH DETAILS: Birth Weight 2.8 kg (6 lbs 3 oz), Length 48 cm. APGAR Scores: 8 (1 min), 9 (5 min)"}	2025-08-27 15:36:44.329294	bed4e3e3-865a-4661-a920-abdc011e013b
23a86436-bdd4-4f57-ae2e-727d690f50b7	patient	012456789012	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":0,"to":0},"doseWeight":{"from":"2.8 kg","to":"2.8 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"NICU-302","to":"NICU-302"},"allergies":{"from":"None","to":"None"},"status":{"from":"NICU Care","to":"NICU Care"},"provider":{"from":"Dr. Kim","to":"Dr. Kim"},"notes":{"from":"BIRTH: 08/27/2025 @ 09:44, Scheduled Cesarean Section (Twin B)\\nPARENT: Emily Chen (MRN: MN-123456789)\\nGESTATION: 37 weeks 5 days (late preterm)\\nBIRTH DETAILS: Birth Weight 2.8 kg (6 lbs 3 oz), Length 48 cm. APGAR Scores: 8 (1 min), 9 (5 min)\\nVITALS: T: 36.7°C, HR: 148, RR: 54\\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother's expressed colostrum via syringe, then breast/bottle as tolerated","to":"BIRTH: 08/27/2025 @ 09:44, Scheduled Cesarean Section (Twin B)\\nGESTATION: 37 weeks 5 days (late preterm)\\nBIRTH DETAILS: Birth Weight 2.8 kg (6 lbs 3 oz), Length 48 cm. APGAR Scores: 8 (1 min), 9 (5 min)"}},"updatedBy":"a"}	2025-08-27 15:36:44.402528	bed4e3e3-865a-4661-a920-abdc011e013b
080cccbf-7de2-4e51-9fd9-c16ea65c4dd9	patient	901345678901	update	{"age":0,"doseWeight":"2.6 kg","codeStatus":"Full Code","isolation":"None","bed":"NICU-301","allergies":"None","status":"NICU Care","provider":"Dr. Kim","notes":"BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\\nGESTATION: 37 weeks 5 days (late preterm)\\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)"}	2025-08-27 15:37:24.741599	bed4e3e3-865a-4661-a920-abdc011e013b
2ee852e3-ec9b-4cce-92d8-dd5357af5ab1	patient	901345678901	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":0,"to":0},"doseWeight":{"from":"2.6 kg","to":"2.6 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"NICU-301","to":"NICU-301"},"allergies":{"from":"None","to":"None"},"status":{"from":"NICU Care","to":"NICU Care"},"provider":{"from":"Dr. Kim","to":"Dr. Kim"},"notes":{"from":"BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\\nPARENT: Emily Chen (MRN: MN-123456789)\\nGESTATION: 37 weeks 5 days (late preterm)\\n\\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)\\n\\nVITALS: T: 36.6°C, HR: 155, RR: 58\\n\\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother's expressed colostrum via syringe, then breast/bottle as tolerated","to":"BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\\nGESTATION: 37 weeks 5 days (late preterm)\\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)"}},"updatedBy":"a"}	2025-08-27 15:37:24.815728	bed4e3e3-865a-4661-a920-abdc011e013b
9cbda86c-5daa-480b-9a84-ea8d158fa315	patient	334455667788	update	{"age":31,"doseWeight":"68 kg","codeStatus":"Full Code","isolation":"None","bed":"OR-3","allergies":"None","status":"Pre-operative","provider":"Dr. Kim","notes":"ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+."}	2025-08-27 15:37:39.071387	bed4e3e3-865a-4661-a920-abdc011e013b
ab5f7d29-98a7-48cb-abb4-a572935bb9ae	patient	334455667788	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":31,"to":31},"doseWeight":{"from":"68 kg","to":"68 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"OR-3","to":"OR-3"},"allergies":{"from":"None","to":"None"},"status":{"from":"Pre-operative","to":"Pre-operative"},"provider":{"from":"Dr. Kim","to":"Dr. Kim"},"notes":{"from":"ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+.","to":"ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+."}},"updatedBy":"a"}	2025-08-27 15:37:39.144701	bed4e3e3-865a-4661-a920-abdc011e013b
006997ac-a177-48f8-853d-3b606420a3ab	patient	234567890123	update	{"age":0,"doseWeight":"3.2 kg","codeStatus":"Full Code","isolation":"None","bed":"NICU-205","allergies":"None","status":"Stable","provider":"Dr. Williams","notes":"BIRTH: 08/27/2025 @ 08:15, Spontaneous Vaginal Delivery\\nGESTATION: 39 weeks 6 days (term)\\nBIRTH DETAILS: Birth Weight 3.2 kg (7 lbs 1 oz), Length 50 cm. APGAR Scores: 8 (1 min), 9 (5 min)\\nSPECIAL CONSIDERATIONS: Mother is B- blood type, cord blood sent for Type & Coombs test"}	2025-08-27 15:38:28.430329	bed4e3e3-865a-4661-a920-abdc011e013b
346a36ec-7924-4528-ae6e-04829898db0a	patient	234567890123	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":0,"to":0},"doseWeight":{"from":"3.2 kg","to":"3.2 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"NICU-205","to":"NICU-205"},"allergies":{"from":"No Known Allergies (NKA)","to":"None"},"status":{"from":"Stable","to":"Stable"},"provider":{"from":"Dr. Williams","to":"Dr. Williams"},"notes":{"from":"BIRTH: 08/27/2025 @ 08:15, Spontaneous Vaginal Delivery\\n\\nPARENT: Jessica Davis (MRN: MN-222333444)\\n\\nGESTATION: 39 weeks 6 days (term)\\n\\nBIRTH DETAILS: Birth Weight 3.2 kg (7 lbs 1 oz), Length 50 cm. APGAR Scores: 8 (1 min), 9 (5 min)\\n\\nVITALS: T: 36.9°C, HR: 152, RR: 55\\n\\nSPECIAL CONSIDERATIONS: Mother is B- blood type, cord blood sent for Type & Coombs test\\n\\nCARE PLAN: Breastfeeding on demand, routine newborn care and screenings","to":"BIRTH: 08/27/2025 @ 08:15, Spontaneous Vaginal Delivery\\nGESTATION: 39 weeks 6 days (term)\\nBIRTH DETAILS: Birth Weight 3.2 kg (7 lbs 1 oz), Length 50 cm. APGAR Scores: 8 (1 min), 9 (5 min)\\nSPECIAL CONSIDERATIONS: Mother is B- blood type, cord blood sent for Type & Coombs test"}},"updatedBy":"a"}	2025-08-27 15:38:28.507995	bed4e3e3-865a-4661-a920-abdc011e013b
1058d771-4e47-4eab-a108-9ceec9a51c07	patient	123456789123	update	{"age":26,"doseWeight":"68 kg","codeStatus":"Full Code","isolation":"None","bed":"PP-205","allergies":"None","status":"Postpartum Day 0","provider":"Dr. Williams","notes":"DELIVERY: 08/27/2025 @ 08:15, Spontaneous Vaginal Delivery with epidural anesthesia; OBSTETRIC HISTORY: G1 P1, 39 weeks 6 days gestation; DELIVERY SUMMARY: 1st-degree perineal laceration repaired, EBL 300 mL; POSTPARTUM ASSESSMENT (11:00): Vitals T 37.4°C, P 78, R 18, BP 118/76. Fundus firm at umbilicus (U/U), lochia rubra moderate, perineum mild edema with ice pack; BLOOD TYPE: B-"}	2025-08-27 15:39:27.713728	bed4e3e3-865a-4661-a920-abdc011e013b
220992e3-58de-4b5f-a425-112205f0ab48	patient	123456789123	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":26,"to":26},"doseWeight":{"from":"68 kg","to":"68 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"PP-205","to":"PP-205"},"allergies":{"from":"No Known Allergies (NKA)","to":"None"},"status":{"from":"Postpartum Day 0","to":"Postpartum Day 0"},"provider":{"from":"Dr. Williams","to":"Dr. Williams"},"notes":{"from":"DELIVERY: 08/27/2025 @ 08:15, Spontaneous Vaginal Delivery with epidural anesthesia\\n\\nOBSTETRIC HISTORY: G1 P1, 39 weeks 6 days gestation\\n\\nDELIVERY SUMMARY: 1st-degree perineal laceration repaired, EBL 300 mL\\n\\nPOSTPARTUM ASSESSMENT (11:00): Vitals T 37.4°C, P 78, R 18, BP 118/76. Fundus firm at umbilicus (U/U), lochia rubra moderate, perineum mild edema with ice pack\\n\\nBLOOD TYPE: B-\\n\\nCARE PLAN: Standard postpartum care, ambulate with assistance, pain management","to":"DELIVERY: 08/27/2025 @ 08:15, Spontaneous Vaginal Delivery with epidural anesthesia; OBSTETRIC HISTORY: G1 P1, 39 weeks 6 days gestation; DELIVERY SUMMARY: 1st-degree perineal laceration repaired, EBL 300 mL; POSTPARTUM ASSESSMENT (11:00): Vitals T 37.4°C, P 78, R 18, BP 118/76. Fundus firm at umbilicus (U/U), lochia rubra moderate, perineum mild edema with ice pack; BLOOD TYPE: B-"}},"updatedBy":"a"}	2025-08-27 15:39:27.789751	bed4e3e3-865a-4661-a920-abdc011e013b
f643d4f0-0641-4f05-8578-16057b26a30c	patient	890234567890	update	{"age":0,"doseWeight":"4.0 kg","codeStatus":"Full Code","isolation":"None","bed":"NICU-202","allergies":"None","status":"Stable","provider":"Dr. Rodriguez","notes":"BIRTH: 08/27/2025 @ 11:01, Pitocin-augmented Vaginal Delivery; GESTATION: 41 weeks 1 day (post-term); BIRTH DETAILS: Birth Weight 4.0 kg (8 lbs 13 oz), Length 53 cm. APGAR Scores: 9 (1 min), 9 (5 min)"}	2025-08-27 15:40:27.400463	bed4e3e3-865a-4661-a920-abdc011e013b
acd1964c-2ded-4b87-9b5f-7b95fc0d0d44	patient	890234567890	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":0,"to":0},"doseWeight":{"from":"4.0 kg","to":"4.0 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"NICU-202","to":"NICU-202"},"allergies":{"from":"No Known Allergies (NKA)","to":"None"},"status":{"from":"Stable","to":"Stable"},"provider":{"from":"Dr. Rodriguez","to":"Dr. Rodriguez"},"notes":{"from":"BIRTH: 08/27/2025 @ 11:01, Pitocin-augmented Vaginal Delivery\\n\\nPARENT: Maria Garcia (MRN: MN-789123456)\\n\\nGESTATION: 41 weeks 1 day (post-term)\\n\\nBIRTH DETAILS: Birth Weight 4.0 kg (8 lbs 13 oz), Length 53 cm. APGAR Scores: 9 (1 min), 9 (5 min)\\n\\nVITALS: T: 36.8°C, HR: 150, RR: 48. Note: Mild peeling skin, common for post-term infants\\n\\nCARE PLAN: Formula feeding 1-2 oz every 3-4 hours, glucose monitoring due to large size","to":"BIRTH: 08/27/2025 @ 11:01, Pitocin-augmented Vaginal Delivery; GESTATION: 41 weeks 1 day (post-term); BIRTH DETAILS: Birth Weight 4.0 kg (8 lbs 13 oz), Length 53 cm. APGAR Scores: 9 (1 min), 9 (5 min)"}},"updatedBy":"a"}	2025-08-27 15:40:27.473837	bed4e3e3-865a-4661-a920-abdc011e013b
fa943c31-bf2d-422c-b512-32fb7926d0b3	patient	223344556677	update	{"age":34,"doseWeight":"70 kg","codeStatus":"Full Code","isolation":"None","bed":"LD-104","allergies":"Penicillin (rash)","status":"Induction","provider":"Dr. Rodriguez","notes":"ADMISSION: 08/27/2025 @ 08:00 for scheduled induction for post-term pregnancy.; LABOR STATUS: G3 P2, 41 weeks 1 day gestation. Cervix 1 cm dilated, 50% effaced, -3 station. Membranes intact. Contractions irregular, mild Braxton Hicks.; MEDICAL HISTORY: Two previous spontaneous vaginal deliveries. Iron-deficiency anemia. Blood Type: A-."}	2025-08-27 15:41:06.056247	bed4e3e3-865a-4661-a920-abdc011e013b
7183fca3-6a83-479a-a0d3-f35f34060ac7	patient	223344556677	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":34,"to":34},"doseWeight":{"from":"70 kg","to":"70 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"LD-104","to":"LD-104"},"allergies":{"from":"Penicillin (rash)","to":"Penicillin (rash)"},"status":{"from":"Induction","to":"Induction"},"provider":{"from":"Dr. Rodriguez","to":"Dr. Rodriguez"},"notes":{"from":"ADMISSION: 08/27/2025 @ 08:00 for scheduled induction for post-term pregnancy.\\n\\nLABOR STATUS: G3 P2, 41 weeks 1 day gestation. Cervix 1 cm dilated, 50% effaced, -3 station. Membranes intact. Contractions irregular, mild Braxton Hicks.\\n\\nMEDICAL HISTORY: Two previous spontaneous vaginal deliveries. Iron-deficiency anemia. Blood Type: A-.","to":"ADMISSION: 08/27/2025 @ 08:00 for scheduled induction for post-term pregnancy.; LABOR STATUS: G3 P2, 41 weeks 1 day gestation. Cervix 1 cm dilated, 50% effaced, -3 station. Membranes intact. Contractions irregular, mild Braxton Hicks.; MEDICAL HISTORY: Two previous spontaneous vaginal deliveries. Iron-deficiency anemia. Blood Type: A-."}},"updatedBy":"a"}	2025-08-27 15:41:06.131646	bed4e3e3-865a-4661-a920-abdc011e013b
b7d5452c-8d8d-488c-8f45-98be939369ae	patient	667788990011	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":32,"to":32},"doseWeight":{"from":"64 kg","to":"64 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"LD-110","to":"LD-110"},"allergies":{"from":"Sulfa drugs (hives)","to":"Sulfa drugs (hives)"},"status":{"from":"TOLAC","to":"TOLAC"},"provider":{"from":"Dr. Anderson","to":"Dr. Anderson"},"notes":{"from":"ADMISSION: 08/27/2025 @ 11:15 for spontaneous active labor, desires Trial of Labor After Cesarean (TOLAC).\\n\\nLABOR STATUS: G2 P1, 40 weeks 2 days gestation. Cervix 5 cm dilated, 100% effaced, 0 station. Membranes intact. Contractions every 3 minutes, lasting 60-70 seconds, strong intensity.\\n\\nMEDICAL HISTORY: One previous C-section for fetal distress. Confirmed low transverse uterine incision. Blood Type: A+.","to":"ADMISSION: 08/27/2025 @ 11:15 for spontaneous active labor, desires Trial of Labor After Cesarean (TOLAC).; LABOR STATUS: G2 P1, 40 weeks 2 days gestation. Cervix 5 cm dilated, 100% effaced, 0 station. Membranes intact. Contractions every 3 minutes, lasting 60-70 seconds, strong intensity.; MEDICAL HISTORY: One previous C-section for fetal distress. Confirmed low transverse uterine incision. Blood Type: A+."}},"updatedBy":"a"}	2025-08-27 15:41:40.929213	bed4e3e3-865a-4661-a920-abdc011e013b
5702a7fc-a466-4a64-81ce-d76fe8d9e353	patient	556677889900	update	{"age":37,"doseWeight":"72 kg","codeStatus":"Full Code","isolation":"Seizure Precautions","bed":"LD-108","allergies":"Codeine (nausea)","status":"Severe Preeclampsia","provider":"Dr. Thompson","notes":"ADMISSION: 08/27/2025 @ 10:45 for elevated blood pressure (165/112) and proteinuria at routine appointment. Reports headache and visual spots.; LABOR STATUS: G1 P0, 36 weeks 0 days gestation. Cervix unfavorable, closed. Membranes intact. No contractions.; MEDICAL HISTORY: Chronic hypertension. Blood Type: O-."}	2025-08-27 15:42:14.848737	bed4e3e3-865a-4661-a920-abdc011e013b
aa28816e-2e45-4444-8e11-f633bf41e7ce	patient	556677889900	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":37,"to":37},"doseWeight":{"from":"72 kg","to":"72 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"Seizure Precautions","to":"Seizure Precautions"},"bed":{"from":"LD-108","to":"LD-108"},"allergies":{"from":"Codeine (nausea)","to":"Codeine (nausea)"},"status":{"from":"Severe Preeclampsia","to":"Severe Preeclampsia"},"provider":{"from":"Dr. Thompson","to":"Dr. Thompson"},"notes":{"from":"ADMISSION: 08/27/2025 @ 10:45 for elevated blood pressure (165/112) and proteinuria at routine appointment. Reports headache and visual spots.\\n\\nLABOR STATUS: G1 P0, 36 weeks 0 days gestation. Cervix unfavorable, closed. Membranes intact. No contractions.\\n\\nMEDICAL HISTORY: Chronic hypertension. Blood Type: O-.","to":"ADMISSION: 08/27/2025 @ 10:45 for elevated blood pressure (165/112) and proteinuria at routine appointment. Reports headache and visual spots.; LABOR STATUS: G1 P0, 36 weeks 0 days gestation. Cervix unfavorable, closed. Membranes intact. No contractions.; MEDICAL HISTORY: Chronic hypertension. Blood Type: O-."}},"updatedBy":"a"}	2025-08-27 15:42:14.919968	bed4e3e3-865a-4661-a920-abdc011e013b
f3ec270a-521f-48f1-8826-dcd08c39a8eb	patient	789123456789	update	{"age":0,"doseWeight":"3.4 kg","codeStatus":"Full Code","isolation":"None","bed":"NICU-201","allergies":"None","status":"Stable","provider":"Dr. Martinez","notes":"BIRTH: 08/27/2025 @ 10:52, Spontaneous Vaginal Delivery; GESTATION: 39 weeks 4 days; BIRTH DETAILS: Birth Weight 3.4 kg (7 lbs 8 oz), Length 51 cm. APGAR Scores: 8 (1 min), 9 (5 min)"}	2025-08-27 15:42:54.95837	bed4e3e3-865a-4661-a920-abdc011e013b
ce2bd85b-d1a8-477b-a71a-067660b46d0e	patient	789123456789	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":0,"to":0},"doseWeight":{"from":"3.4 kg","to":"3.4 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"NICU-201","to":"NICU-201"},"allergies":{"from":"None","to":"None"},"status":{"from":"Stable","to":"Stable"},"provider":{"from":"Dr. Martinez","to":"Dr. Martinez"},"notes":{"from":"BIRTH: 08/27/2025 @ 10:52, Spontaneous Vaginal Delivery\\n\\nPARENT: Olivia Smith (MRN: MN-456789123)\\n\\nGESTATION: 39 weeks 4 days\\n\\nBIRTH DETAILS: Birth Weight 3.4 kg (7 lbs 8 oz), Length 51 cm. APGAR Scores: 8 (1 min), 9 (5 min)\\n\\nVITALS: T: 37.0°C, HR: 145, RR: 50\\n\\nCARE PLAN: Breastfeeding on demand, routine newborn care","to":"BIRTH: 08/27/2025 @ 10:52, Spontaneous Vaginal Delivery; GESTATION: 39 weeks 4 days; BIRTH DETAILS: Birth Weight 3.4 kg (7 lbs 8 oz), Length 51 cm. APGAR Scores: 8 (1 min), 9 (5 min)"}},"updatedBy":"a"}	2025-08-27 15:42:55.032203	bed4e3e3-865a-4661-a920-abdc011e013b
c19919eb-aa67-48d9-91a5-99834daa63ea	patient	112233445566	update	{"age":28,"doseWeight":"65 kg","codeStatus":"Full Code","isolation":"None","bed":"LD-102","allergies":"None","status":"Active Labor","provider":"Dr. Martinez","notes":"ADMISSION: 08/27/2025 @ 06:30 for spontaneous rupture of membranes (SROM) with clear fluid, active labor.; LABOR STATUS: G1 P0, 39 weeks 4 days gestation. Cervix 4 cm dilated, 90% effaced, -1 station. Membranes ruptured. Contractions every 3-4 minutes, lasting 60 seconds, moderate intensity.; MEDICAL HISTORY: Uncomplicated prenatal course. GBS negative. Blood Type: O+."}	2025-08-27 15:43:34.996658	bed4e3e3-865a-4661-a920-abdc011e013b
6f79702a-bfa8-496d-9076-6292626facd4	patient	112233445566	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":28,"to":28},"doseWeight":{"from":"65 kg","to":"65 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"LD-102","to":"LD-102"},"allergies":{"from":"None","to":"None"},"status":{"from":"Active Labor","to":"Active Labor"},"provider":{"from":"Dr. Martinez","to":"Dr. Martinez"},"notes":{"from":"ADMISSION: 08/27/2025 @ 06:30 for spontaneous rupture of membranes (SROM) with clear fluid, active labor.\\n\\nLABOR STATUS: G1 P0, 39 weeks 4 days gestation. Cervix 4 cm dilated, 90% effaced, -1 station. Membranes ruptured. Contractions every 3-4 minutes, lasting 60 seconds, moderate intensity.\\n\\nMEDICAL HISTORY: Uncomplicated prenatal course. GBS negative. Blood Type: O+.","to":"ADMISSION: 08/27/2025 @ 06:30 for spontaneous rupture of membranes (SROM) with clear fluid, active labor.; LABOR STATUS: G1 P0, 39 weeks 4 days gestation. Cervix 4 cm dilated, 90% effaced, -1 station. Membranes ruptured. Contractions every 3-4 minutes, lasting 60 seconds, moderate intensity.; MEDICAL HISTORY: Uncomplicated prenatal course. GBS negative. Blood Type: O+."}},"updatedBy":"a"}	2025-08-27 15:43:35.071177	bed4e3e3-865a-4661-a920-abdc011e013b
77ec5ff9-a689-4b8c-bad2-2c584689e2f5	patient	445566778899	update	{"age":24,"doseWeight":"58 kg","codeStatus":"Full Code","isolation":"None","bed":"LD-106","allergies":"None","status":"Preterm Labor","provider":"Dr. Johnson","notes":"ADMISSION: 08/27/2025 @ 02:15 for reports of regular, painful contractions.; LABOR STATUS: G2 P1, 33 weeks 2 days gestation. Cervix 2 cm dilated, 75% effaced, -2 station. Membranes intact. Contractions every 5-7 minutes, lasting 45 seconds.; MEDICAL HISTORY: Previous preterm delivery at 35 weeks. Blood Type: AB+."}	2025-08-27 15:44:16.210728	bed4e3e3-865a-4661-a920-abdc011e013b
0b6e2bab-a36f-491d-8e30-164d726b8581	patient	445566778899	update	{"updated_fields":["age","doseWeight","codeStatus","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":24,"to":24},"doseWeight":{"from":"58 kg","to":"58 kg"},"codeStatus":{"from":"Full Code","to":"Full Code"},"isolation":{"from":"None","to":"None"},"bed":{"from":"LD-106","to":"LD-106"},"allergies":{"from":"None","to":"None"},"status":{"from":"Preterm Labor","to":"Preterm Labor"},"provider":{"from":"Dr. Johnson","to":"Dr. Johnson"},"notes":{"from":"ADMISSION: 08/27/2025 @ 02:15 for reports of regular, painful contractions.\\n\\nLABOR STATUS: G2 P1, 33 weeks 2 days gestation. Cervix 2 cm dilated, 75% effaced, -2 station. Membranes intact. Contractions every 5-7 minutes, lasting 45 seconds.\\n\\nMEDICAL HISTORY: Previous preterm delivery at 35 weeks. Blood Type: AB+.","to":"ADMISSION: 08/27/2025 @ 02:15 for reports of regular, painful contractions.; LABOR STATUS: G2 P1, 33 weeks 2 days gestation. Cervix 2 cm dilated, 75% effaced, -2 station. Membranes intact. Contractions every 5-7 minutes, lasting 45 seconds.; MEDICAL HISTORY: Previous preterm delivery at 35 weeks. Blood Type: AB+."}},"updatedBy":"a"}	2025-08-27 15:44:16.284755	bed4e3e3-865a-4661-a920-abdc011e013b
23f2f911-7f57-4f8e-8abc-fa230e7d467f	prescription	3719c29c-d4be-4b57-a7c5-e3b048249f50	create	{"patientId":"334455667788","medicineId":"10000009","dosage":"325 mg","periodicity":"Every 6 hours","duration":"10 days","route":"Oral","startDate":"2025-08-27T00:00:00.000Z","endDate":"2025-09-05T00:00:00.000Z"}	2025-08-27 17:18:38.668784	\N
f5c37698-8603-4ceb-98a3-e38057f677be	prescription	3719c29c-d4be-4b57-a7c5-e3b048249f50	create	{"patient_id":"334455667788","medicine_id":"10000009","action":"prescription_added"}	2025-08-27 17:18:38.751548	\N
\.


--
-- Data for Name: care_notes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.care_notes (id, patient_id, content, category, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: care_plans; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.care_plans (id, patient_id, problem, goal, interventions, evaluation, priority, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: imaging_files; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.imaging_files (id, patient_id, study_type, study_description, body_part, findings, impression, study_date, reported_by, image_url, created_at) FROM stdin;
ba80769c-4156-4fdb-9404-419791f6b8c8	901345678901	ultrasound	Abdominal Ultrasound	abdomen	Normal liver echotexture. Gallbladder without stones. Kidneys normal size.	Normal abdominal ultrasound.	2025-08-27 10:00:00	Dr. Radiologist	https://example.com/sample-abdo_us.jpg	2025-08-27 16:25:55.138739
\.


--
-- Data for Name: intake_output; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.intake_output (id, patient_id, type, category, amount, description, recorded_at, recorded_by, created_at) FROM stdin;
\.


--
-- Data for Name: lab_results; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lab_results (id, patient_id, test_name, value, unit, reference_range, status, created_at, test_code, taken_at, resulted_at, notes) FROM stdin;
4d983209-09e5-4218-95a2-f02b3967f60b	112233445566	Complete Blood Count - Hemoglobin	12.5	g/dL	12.0-16.0 g/dL	normal	2025-08-27 15:17:21.350845	CBC-HGB	2025-08-25 08:00:00	2025-08-25 10:30:00	Hemoglobin within normal limits
32e56146-2343-48f6-a1b8-81ea26495fa6	112233445566	Complete Blood Count - White Blood Cells	7200	cells/μL	4500-11000 cells/μL	normal	2025-08-27 15:17:21.42705	CBC-WBC	2025-08-25 08:00:00	2025-08-25 10:30:00	\N
6e1be5b2-6e21-49f9-900d-6675ff73ea64	112233445566	Basic Metabolic Panel - Glucose	95	mg/dL	70-100 mg/dL	normal	2025-08-27 15:17:21.50045	BMP-GLU	2025-08-25 08:00:00	2025-08-25 09:45:00	Fasting glucose normal
a74e617b-112d-40ac-bbff-ffcc3bf2f593	112233445566	Basic Metabolic Panel - Creatinine	0.9	mg/dL	0.6-1.2 mg/dL	normal	2025-08-27 15:17:21.573867	BMP-CREAT	2025-08-25 08:00:00	2025-08-25 09:45:00	Kidney function normal
f5cc037c-ab88-48a3-b951-a45a749c87f7	112233445566	Hemoglobin A1C	5.8	%	<7.0%	normal	2025-08-27 15:17:21.649348	HbA1c	2025-08-20 09:00:00	2025-08-21 14:00:00	Good diabetic control
5611cea0-a18a-4f9f-9943-9a998030ec4b	223344556677	Lipid Panel - Total Cholesterol	220	mg/dL	<200 mg/dL	abnormal	2025-08-27 15:17:21.723553	LIPID-CHOL	2025-08-24 10:30:00	2025-08-24 15:00:00	Elevated cholesterol, recommend dietary changes
48e3bc5b-3ed9-4ab6-8550-23b648e7d6b8	223344556677	Lipid Panel - LDL Cholesterol	145	mg/dL	<100 mg/dL	abnormal	2025-08-27 15:17:21.799202	LIPID-LDL	2025-08-24 10:30:00	2025-08-24 15:00:00	LDL elevated
f7ee2078-41ba-4545-86bd-fe544ef0203a	223344556677	Lipid Panel - HDL Cholesterol	38	mg/dL	>40 mg/dL (M), >50 mg/dL (F)	abnormal	2025-08-27 15:17:21.872961	LIPID-HDL	2025-08-24 10:30:00	2025-08-24 15:00:00	HDL low, consider exercise
67b1a718-f147-48cd-b736-f78f67f7597f	223344556677	Thyroid Stimulating Hormone	2.1	mIU/L	0.4-4.0 mIU/L	normal	2025-08-27 15:17:21.946335	TSH	2025-08-24 10:30:00	2025-08-24 16:30:00	Thyroid function normal
eb850889-b668-4d49-9427-26c9e4414c52	223344556677	Prostate Specific Antigen	1.8	ng/mL	<4.0 ng/mL	normal	2025-08-27 15:17:22.019799	PSA	2025-08-22 08:00:00	2025-08-22 14:00:00	Annual screening - normal
\.


--
-- Data for Name: lab_test_types; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lab_test_types (id, code, name, category, unit, reference_range, is_active, created_at) FROM stdin;
cd7091b2-25be-465f-9f83-1b07d2f7055e	CBC-HGB	Complete Blood Count - Hemoglobin	Hematology	g/dL	12.0-16.0 g/dL	1	2025-08-26 19:47:59.590699
21ad6f9f-72b4-4c4b-9b7e-badf4316404e	CBC-WBC	Complete Blood Count - White Blood Cells	Hematology	cells/μL	4500-11000 cells/μL	1	2025-08-26 19:47:59.665489
040274e6-7ca5-4e7c-9c4f-2a4f37ba5af2	BMP-GLU	Basic Metabolic Panel - Glucose	Chemistry	mg/dL	70-100 mg/dL	1	2025-08-26 19:47:59.739709
e21bb91c-0e6c-48d5-b6ae-aed60faedd4f	BMP-CREAT	Basic Metabolic Panel - Creatinine	Chemistry	mg/dL	0.6-1.2 mg/dL	1	2025-08-26 19:47:59.813162
4a5919d2-3692-43ee-84f4-fb00f0303f94	HbA1c	Hemoglobin A1C	Endocrinology	%	<7.0%	1	2025-08-26 19:47:59.887875
a2b9cbd6-93cc-4e40-94a7-a69462ff5e07	LIPID-CHOL	Lipid Panel - Total Cholesterol	Chemistry	mg/dL	<200 mg/dL	1	2025-08-26 19:47:59.960956
3c69a2bd-15a3-488f-a712-6d21c0bab0b2	LIPID-LDL	Lipid Panel - LDL Cholesterol	Chemistry	mg/dL	<100 mg/dL	1	2025-08-26 19:48:00.035488
158088a4-8280-4b5a-9489-984592a66a96	LIPID-HDL	Lipid Panel - HDL Cholesterol	Chemistry	mg/dL	>40 mg/dL (M), >50 mg/dL (F)	1	2025-08-26 19:48:00.109752
eb18cf61-7d8c-442c-97b5-0cfef48249d7	TSH	Thyroid Stimulating Hormone	Endocrinology	mIU/L	0.4-4.0 mIU/L	1	2025-08-26 19:48:00.184121
8cb233a9-65fe-4e10-8ea5-7078c89642ca	PSA	Prostate Specific Antigen	Endocrinology	ng/mL	<4.0 ng/mL	1	2025-08-26 19:48:00.256873
1b1135a5-08f5-41d4-b1f7-8e51d92c5b42	CBC-RBC	Red Blood Cells	Hematology	cells/μL	4.2-5.4 million cells/μL (M), 3.6-5.0 million cells/μL (F)	1	2025-08-26 19:53:59.660986
d6757b3d-d360-44d9-87ac-7e17ce0e3472	CBC-HCT	Hematocrit	Hematology	%	40.7-50.3% (M), 36.1-44.3% (F)	1	2025-08-26 19:53:59.660986
cf31e10c-89b3-41a2-a196-7650615d7d97	CBC-MCV	Mean Corpuscular Volume	Hematology	fL	80-100 fL	1	2025-08-26 19:53:59.660986
23e7210c-c63d-42cd-a4fb-febe9916a44e	CBC-MCH	Mean Corpuscular Hemoglobin	Hematology	pg	27-32 pg	1	2025-08-26 19:53:59.660986
45929372-a985-4daa-ab53-b6f3fec7ff4c	CBC-RDW	Red Cell Distribution Width	Hematology	%	11.5-14.5%	1	2025-08-26 19:53:59.660986
3c622e69-7b8d-4cd5-8dc3-63cc9d840301	CBC-PLT	Platelets	Hematology	cells/μL	150,000-450,000 cells/μL	1	2025-08-26 19:53:59.660986
92d11042-5666-4674-82d8-e462fe271609	CBC-MPV	Mean Platelet Volume	Hematology	fL	7.4-10.4 fL	1	2025-08-26 19:53:59.660986
26ad9230-35b8-40fc-891a-d109491b5add	CBC-NEUT	Neutrophils	Hematology	%	50-70%	1	2025-08-26 19:53:59.660986
671406a1-6b7b-46d3-90ca-1211c2fd02d4	CHEM-NA	Sodium	Chemistry	mEq/L	136-145 mEq/L	1	2025-08-26 19:53:59.660986
e2c5ff19-6dc2-4f4c-a928-3609654dd842	CHEM-K	Potassium	Chemistry	mEq/L	3.5-5.0 mEq/L	1	2025-08-26 19:53:59.660986
f1205006-8b8d-40cb-a560-7a24b7da7b25	CHEM-CL	Chloride	Chemistry	mEq/L	98-107 mEq/L	1	2025-08-26 19:53:59.660986
d9dc7f55-dd26-435d-b5f3-17450f38e29a	CHEM-CO2	Carbon Dioxide	Chemistry	mEq/L	22-28 mEq/L	1	2025-08-26 19:53:59.660986
c03aa84e-40df-4d0a-9939-ab17839338ba	CHEM-BUN	Blood Urea Nitrogen	Chemistry	mg/dL	7-20 mg/dL	1	2025-08-26 19:53:59.660986
3a21967c-b14d-4f38-accc-6e806c56683c	CHEM-ALB	Albumin	Chemistry	g/dL	3.5-5.0 g/dL	1	2025-08-26 19:53:59.660986
\.


--
-- Data for Name: medicines; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.medicines (id, name, drawer, bin) FROM stdin;
10000001	Albuteral Nebulizer	1	1
10000002	Ipratropium Nebulizer	1	2
10000003	Advair diskus	1	3
10000004	Amlopidine 5 mg	1	4
10000005	Amlopidine 10 mg	1	5
10000006	Lorazepam IVP	1	6
10000007	Lorazepam PO	1	7
10000008	Mulitivitamin	1	8
10000009	Acetaminophen 325 mg	1	9
10000010	ASA 81 mg	1	10
10000011	Atorvastatin	1	11
10000012	Biscodyl	1	12
10000013	Captopril	1	13
10000014	Carvedilol 3.125 mg	1	14
10000015	Carvedilol 12.5 mg	1	15
10000016	Acetaminophen 500 mg	1	16
10000017	Diphenhydramine	1	17
10000018	Diltiazem 120 mg	1	18
10000019	Digoxen 0.25 mg	1	19
10000020	Donepezil 10 mg	1	20
10000021	Pantoprazole 20 mg	1	21
10000022	24% sucrose (Sweet-Ease) Oral Solution 0.5 mL	1	22
20000001	Atenolol 50 mg	2	1
20000002	Docusate Sodium 50 mg	2	2
20000003	Furosemide 20 mg	2	3
20000004	Ibuprofen 200 mg	2	4
20000005	Lisinopril 5 mg	2	5
20000006	Phenytoin 100 mg	2	6
20000007	Metoprolol 25 mg	2	7
20000008	Lisinopril 10 mg	2	8
20000009	Metoprolol 50 mg	2	9
20000010	Erythromycin 250 mg	2	10
20000011	Iron 65 mg	2	11
20000012	Calcium carbonate 500 mg	2	12
20000013	Milk of magnesia 2400 mg	2	13
20000014	Nicotene patch	2	14
20000015	Nitro tabs	2	15
20000016	Ondansetron	2	16
20000017	Senosides	2	17
20000018	Potassium po	2	18
20000020	Synthroid 50 mcg	2	20
20000021	Losartan 25 mg	2	21
20000022	Warfarin 5 mg	2	22
30000001	Ketorlac	3	1
30000002	Heparin	3	2
30000003	Fentanyl	3	3
30000004	Oxycodone/Acetaminophen 5/325 mg	3	4
30000005	Haloperidol	3	5
30000006	Metoprolol IVP	3	6
30000007	Oxycodone 5 mg	3	7
30000008	Tramadol	3	8
30000009	Methylprednisone	3	9
30000010	Furosemide	3	10
30000011	Morphine sulfate	3	11
30000012	Ondansetron IVP	3	12
30000013	Diphenhydramine IVP	3	13
30000014	Hydropmorphone IVP	3	14
30000015	Midalozam IV 2mg/mL	3	15
40000001	Heparin Sodium 25000 in 250	4	1
40000002	Cefazolin 1G in 100	4	2
40000003	Pipercillin/Tazobactim D5 1/2NS w/ 20K	4	3
31908432	Acetaminophen	A1	01
95283134	Ibuprofen	A1	01
60329247	Amoxicillin	A1	01
09509828	Metformin	A1	01
20944348	Lisinopril	A1	01
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.patients (id, name, dob, age, dose_weight, sex, mrn, fin, admitted, isolation, bed, allergies, status, provider, notes, department, chart_data, created_at) FROM stdin;
234567890123	Baby Girl Davis	2025-08-27	0	3.2 kg	Female	MN-222333444-01	FN-222333444-01	2025-08-27	None	NB-01	None	Observation	Dr. Williams	BIRTH: 08/27/2025 @ 08:15, Spontaneous Vaginal Delivery\nGESTATION: 39 weeks 6 days (term)\nBIRTH DETAILS: Birth Weight 3.2 kg (7 lbs 1 oz), Length 50 cm. APGAR Scores: 8 (1 min), 9 (5 min)\nSPECIAL CONSIDERATIONS: Mother is B- blood type, cord blood sent for Type & Coombs test	Newborn	{"background": "Term newborn female delivered via spontaneous vaginal delivery to primigravida mother with B- blood type.", "summary": "Healthy term newborn with excellent APGAR scores, requires Rh incompatibility monitoring.", "discharge": "Pending completion of newborn screenings and feeding establishment.", "handoff": "Stable term newborn, cord blood sent for Type & Coombs due to maternal B- blood type."}	2025-08-27 15:33:01.85766
901345678901	Baby A Chen (Twin 1)	2025-08-27	0	2.6 kg	Female	MN-123456789-01	FN-123456789-01	2025-08-27	None	NICU-01	None	Observation	Dr. Kim	BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\nGESTATION: 37 weeks 5 days (late preterm)\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)	NICU	{"background": "Late preterm twin A delivered via scheduled Cesarean section, requiring NICU care.", "summary": "Twin A requiring transitional care for late preterm status and glucose monitoring.", "discharge": "Pending stable transition and feeding establishment.", "handoff": "Twin A in NICU for transitional care, glucose monitoring, and feeding support."}	2025-08-27 15:28:48.774907
334455667788	Emily Chen	1993-09-12	31	68 kg	Female	MN-123456789	FN-123456789	2025-08-27	None	LD-03	None	Postpartum / Couplet Care	Dr. Kim	ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+.	Labor & Delivery	{"background":"Primigravida with dichorionic-diamniotic twins scheduled for Cesarean delivery.","summary":"Twin pregnancy at term equivalent with breech presentation requiring surgical delivery.","discharge":"To be determined post-operatively.","handoff":"Pre-operative patient for scheduled C-section, twins require NICU evaluation."}	2025-08-27 15:17:19.505857
223344556677	Maria Garcia	1991-02-14	34	70 kg	Female	MN-789123456	FN-789123456	2025-08-27	None	LD-04	Penicillin (rash)	LDR (Labor, Delivery, Recovery)	Dr. Rodriguez	ADMISSION: 08/27/2025 @ 08:00 for scheduled induction for post-term pregnancy.; LABOR STATUS: G3 P2, 41 weeks 1 day gestation. Cervix 1 cm dilated, 50% effaced, -3 station. Membranes intact. Contractions irregular, mild Braxton Hicks.; MEDICAL HISTORY: Two previous spontaneous vaginal deliveries. Iron-deficiency anemia. Blood Type: A-.	Labor & Delivery	{"background":"Multigravida (G3 P2) patient at 41 weeks 1 day gestation for scheduled induction.","summary":"Post-term pregnancy requiring induction with history of uncomplicated deliveries.","discharge":"To be determined based on delivery outcome.","handoff":"Patient scheduled for induction, monitor response to Pitocin and fetal tolerance."}	2025-08-27 15:17:19.427556
112233445566	Olivia Smith	1997-03-15	28	65 kg	Female	MN-456789123	FN-456789123	2025-08-27	None	LD-05	None	Active Labor	Dr. Martinez	ADMISSION: 08/27/2025 @ 06:30 for spontaneous rupture of membranes (SROM) with clear fluid, active labor.; LABOR STATUS: G1 P0, 39 weeks 4 days gestation. Cervix 4 cm dilated, 90% effaced, -1 station. Membranes ruptured. Contractions every 3-4 minutes, lasting 60 seconds, moderate intensity.; MEDICAL HISTORY: Uncomplicated prenatal course. GBS negative. Blood Type: O+.	Labor & Delivery	{"background":"First-time mother (G1 P0) at 39 weeks 4 days gestation admitted in active labor.","summary":"Low-risk first-time mother progressing well in labor with clear amniotic fluid.","discharge":"To be determined based on delivery outcome.","handoff":"Active labor patient, monitor cervical dilation and fetal heart tones."}	2025-08-27 15:17:19.346951
445566778899	Aisha Williams	2000-12-10	24	58 kg	Female	MN-987654321	FN-987654321	2025-08-27	None	LD-01	None	Preterm Labor	Dr. Johnson	ADMISSION: 08/27/2025 @ 02:15 for reports of regular, painful contractions.; LABOR STATUS: G2 P1, 33 weeks 2 days gestation. Cervix 2 cm dilated, 75% effaced, -2 station. Membranes intact. Contractions every 5-7 minutes, lasting 45 seconds.; MEDICAL HISTORY: Previous preterm delivery at 35 weeks. Blood Type: AB+.	Labor & Delivery	{"background":"Multigravida with history of preterm delivery presenting with preterm labor.","summary":"Preterm labor at 33 weeks requiring tocolysis and fetal neuroprotection.","discharge":"To be determined based on response to treatment.","handoff":"Preterm labor patient on strict bed rest with magnesium sulfate and betamethasone."}	2025-08-27 15:17:19.579933
667788990011	Chloe Johnson	1992-04-18	32	64 kg	Female	MN-555444333	FN-555444333	2025-08-27	None	LD-02	Sulfa drugs (hives)	TOLAC	Dr. Anderson	ADMISSION: 08/27/2025 @ 11:15 for spontaneous active labor, desires Trial of Labor After Cesarean (TOLAC).; LABOR STATUS: G2 P1, 40 weeks 2 days gestation. Cervix 5 cm dilated, 100% effaced, 0 station. Membranes intact. Contractions every 3 minutes, lasting 60-70 seconds, strong intensity.; MEDICAL HISTORY: One previous C-section for fetal distress. Confirmed low transverse uterine incision. Blood Type: A+.	Labor & Delivery	{"background":"VBAC candidate with previous low transverse C-section in active labor.","summary":"Trial of Labor After Cesarean with favorable cervical exam and strong labor pattern.","discharge":"To be determined based on labor progress and TOLAC success.","handoff":"TOLAC patient requiring continuous monitoring, consent signed for repeat C-section if needed."}	2025-08-27 15:17:19.727834
123456789123	Jessica Davis	1999-02-12	26	68 kg	Female	MN-222333444	FN-222333444	2025-08-27	None	LD-07	None	Postpartum Recovery	Dr. Williams	DELIVERY: 08/27/2025 @ 08:15, Spontaneous Vaginal Delivery with epidural anesthesia; OBSTETRIC HISTORY: G1 P1, 39 weeks 6 days gestation; DELIVERY SUMMARY: 1st-degree perineal laceration repaired, EBL 300 mL; POSTPARTUM ASSESSMENT (11:00): Vitals T 37.4°C, P 78, R 18, BP 118/76. Fundus firm at umbilicus (U/U), lochia rubra moderate, perineum mild edema with ice pack; BLOOD TYPE: B-	Postpartum	{"background": "26-year-old primigravida delivered term infant via spontaneous vaginal delivery with epidural.", "summary": "Uncomplicated spontaneous vaginal delivery with minor perineal laceration, stable postpartum course.", "discharge": "Pending completion of postpartum recovery and newborn care education.", "handoff": "Postpartum day 0, stable vitals, fundus firm, managing perineal laceration with comfort measures."}	2025-08-27 15:33:01.85766
012456789012	Baby B Chen (Twin 2)	2025-08-27	0	2.8 kg	Male	MN-123456789-02	FN-123456789-02	2025-08-27	None	NICU-02	None	Observation	Dr. Kim	BIRTH: 08/27/2025 @ 09:44, Scheduled Cesarean Section (Twin B)\nGESTATION: 37 weeks 5 days (late preterm)\nBIRTH DETAILS: Birth Weight 2.8 kg (6 lbs 3 oz), Length 48 cm. APGAR Scores: 8 (1 min), 9 (5 min)	NICU	{"background": "Late preterm twin B delivered via scheduled Cesarean section, requiring NICU care.", "summary": "Twin B requiring transitional care for late preterm status and glucose monitoring.", "discharge": "Pending stable transition and feeding establishment.", "handoff": "Twin B in NICU for transitional care, glucose monitoring, and feeding support."}	2025-08-27 15:28:48.774907
556677889900	Sophia Miller	1987-06-25	37	72 kg	Female	MN-654321987	FN-654321987	2025-08-27	Seizure Precautions	LD-06	Codeine (nausea)	Severe Preeclampsia	Dr. Thompson	ADMISSION: 08/27/2025 @ 10:45 for elevated blood pressure (165/112) and proteinuria at routine appointment. Reports headache and visual spots.; LABOR STATUS: G1 P0, 36 weeks 0 days gestation. Cervix unfavorable, closed. Membranes intact. No contractions.; MEDICAL HISTORY: Chronic hypertension. Blood Type: O-.	Labor & Delivery	{"background":"Primigravida with chronic hypertension developing severe preeclampsia.","summary":"Severe preeclampsia requiring magnesium sulfate and delivery planning.","discharge":"To be determined based on maternal and fetal status.","handoff":"Patient on seizure precautions with magnesium sulfate, monitor BP and symptoms."}	2025-08-27 15:17:19.655041
890234567890	Baby Girl Garcia	2025-08-27	0	4.0 kg	Female	MN-789123456-01	FN-789123456-01	2025-08-27	None	NB-02	None	Observation	Dr. Rodriguez	BIRTH: 08/27/2025 @ 11:01, Pitocin-augmented Vaginal Delivery; GESTATION: 41 weeks 1 day (post-term); BIRTH DETAILS: Birth Weight 4.0 kg (8 lbs 13 oz), Length 53 cm. APGAR Scores: 9 (1 min), 9 (5 min)	Newborn	{"background": "Post-term newborn female delivered via augmented vaginal delivery, large for gestational age.", "summary": "Post-term large newborn with excellent APGAR scores requiring glucose monitoring.", "discharge": "Pending stable glucose levels and feeding tolerance.", "handoff": "Large post-term newborn requiring glucose monitoring before first three feeds."}	2025-08-27 15:28:48.774907
789123456789	Baby Boy Smith	2025-08-27	0	3.4 kg	Male	MN-456789123-01	FN-456789123-01	2025-08-27	None	NB-03	None	Observation	Dr. Martinez	BIRTH: 08/27/2025 @ 10:52, Spontaneous Vaginal Delivery; GESTATION: 39 weeks 4 days; BIRTH DETAILS: Birth Weight 3.4 kg (7 lbs 8 oz), Length 51 cm. APGAR Scores: 8 (1 min), 9 (5 min)	Newborn	{"background": "Term newborn male delivered via spontaneous vaginal delivery to primigravida mother.", "summary": "Healthy term newborn with excellent APGAR scores, stable vital signs.", "discharge": "Pending completion of newborn screenings and feeding establishment.", "handoff": "Stable newborn requiring routine care and screenings."}	2025-08-27 15:28:27.427457
\.


--
-- Data for Name: prescriptions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.prescriptions (id, patient_id, medicine_id, dosage, periodicity, duration, start_date, end_date, route) FROM stdin;
1	112233445566	31908432	500mg	Every 6 hours	7 days	2025-08-26 00:00:00	2025-09-02 00:00:00	Oral
2	112233445566	95283134	25mg	Once daily	2 weeks	2025-08-26 00:00:00	2025-09-09 00:00:00	Oral
3	112233445566	60329247	250mg	Twice daily	10 days	2025-08-26 00:00:00	2025-09-05 00:00:00	Oral
4	223344556677	09509828	500mg	Twice daily	Ongoing	2025-08-20 00:00:00	\N	Oral
5	223344556677	31908432	1000mg	Once daily	5 days	2025-08-26 00:00:00	2025-08-31 00:00:00	Oral
6	223344556677	20944348	10mg	Once daily	Ongoing	2025-08-20 00:00:00	\N	Oral
3719c29c-d4be-4b57-a7c5-e3b048249f50	334455667788	10000009	325 mg	Every 6 hours	10 days	2025-08-27 00:00:00	2025-09-05 00:00:00	Oral
\.


--
-- Data for Name: provider_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.provider_orders (id, patient_id, order_type, description, status, ordered_by, ordered_at, discontinued_at, discontinued_by, created_at) FROM stdin;
5938d02c-1f34-4080-94f2-d899418149c1	112233445566	activity	Ambulate as tolerated	active	Dr. Martinez	2025-08-27 06:30:00	\N	\N	2025-08-27 15:17:22.09309
73fd3770-2b41-4ad8-9607-883bf0005aac	112233445566	diet	Clear liquids	active	Dr. Martinez	2025-08-27 06:30:00	\N	\N	2025-08-27 15:17:22.169596
93d7fddb-f6d8-4b22-a91e-4f79bf3c7d23	112233445566	procedure	Continuous fetal monitoring	active	Dr. Martinez	2025-08-27 06:30:00	\N	\N	2025-08-27 15:17:22.243113
8da7eb6f-137d-419d-8c91-0fd63d36a802	112233445566	medication	Saline lock. Awaiting request for epidural.	active	Dr. Martinez	2025-08-27 06:30:00	\N	\N	2025-08-27 15:17:22.316714
4d9bad4a-2c63-47d7-ae2d-1461273ed37f	223344556677	diet	Regular diet until active labor begins	active	Dr. Rodriguez	2025-08-27 08:00:00	\N	\N	2025-08-27 15:17:22.390442
b8341b1f-f86e-41f3-9788-06ad774bc806	223344556677	medication	Begin Pitocin infusion per protocol	active	Dr. Rodriguez	2025-08-27 08:00:00	\N	\N	2025-08-27 15:17:22.463823
21a0c660-beb4-4d53-ac77-1d1e01f9b9ec	223344556677	procedure	Continuous fetal monitoring once Pitocin is initiated	active	Dr. Rodriguez	2025-08-27 08:00:00	\N	\N	2025-08-27 15:17:22.54198
0b702281-906e-4ed6-9afe-77e2750eea98	223344556677	lab	CBC, Type & Screen	active	Dr. Rodriguez	2025-08-27 08:00:00	\N	\N	2025-08-27 15:17:22.615092
13af1171-0a74-4e59-a7e8-456afc98ee0d	334455667788	diet	NPO since midnight	active	Dr. Kim	2025-08-27 09:00:00	\N	\N	2025-08-27 15:17:22.690626
11e2b6a0-8890-4417-bb65-7809ca7206b1	334455667788	medication	Pre-operative IV antibiotics (Ancef 2g). Spinal anesthesia.	active	Dr. Kim	2025-08-27 09:00:00	\N	\N	2025-08-27 15:17:22.762838
d5bd06ea-2bbb-4ef9-bd3c-273567370db9	334455667788	procedure	Abdominal prep for C-section	active	Dr. Kim	2025-08-27 09:00:00	\N	\N	2025-08-27 15:17:22.836746
4c4908e2-59ac-4db8-9db1-cfe9f1b9b911	334455667788	lab	CBC, CMP, Type & Crossmatch 2 units PRBCs	active	Dr. Kim	2025-08-27 09:00:00	\N	\N	2025-08-27 15:17:22.912936
188b640f-dd78-4fdc-8246-cd8e504a64be	445566778899	activity	Strict bed rest	active	Dr. Johnson	2025-08-27 02:15:00	\N	\N	2025-08-27 15:17:22.997486
4942dd70-81ec-4e45-bb70-50647fa01d6e	445566778899	medication	Betamethasone 12mg IM x 2 doses, 24 hours apart	active	Dr. Johnson	2025-08-27 02:15:00	\N	\N	2025-08-27 15:17:23.071377
6e4b4401-b635-4f01-a7cd-88480ef5a076	445566778899	medication	Magnesium Sulfate bolus and maintenance infusion for neuroprotection	active	Dr. Johnson	2025-08-27 02:15:00	\N	\N	2025-08-27 15:17:23.144751
5e1727f7-5d92-457e-81ca-713bc5cbf6b7	445566778899	medication	Tocolysis with Nifedipine	active	Dr. Johnson	2025-08-27 02:15:00	\N	\N	2025-08-27 15:17:23.220282
62725e33-42de-4d60-b66a-9a88ef041ecd	445566778899	procedure	Continuous fetal and contraction monitoring	active	Dr. Johnson	2025-08-27 02:15:00	\N	\N	2025-08-27 15:17:23.294443
9dbf810d-2f01-46f3-a07a-951e6b785879	445566778899	procedure	NICU consult	active	Dr. Johnson	2025-08-27 02:15:00	\N	\N	2025-08-27 15:17:23.368283
cd4c211c-061d-406b-9aa7-8ebcd9e96661	556677889900	activity	Strict bed rest, seizure precautions	active	Dr. Thompson	2025-08-27 10:45:00	\N	\N	2025-08-27 15:17:23.444418
aa0c8b74-77e2-4532-811c-d1f02655333e	556677889900	diet	NPO	active	Dr. Thompson	2025-08-27 10:45:00	\N	\N	2025-08-27 15:17:23.517593
805cfb8c-9aed-4ba2-9c65-788abda39cb3	556677889900	medication	Magnesium Sulfate bolus and maintenance infusion for seizure prophylaxis	active	Dr. Thompson	2025-08-27 10:45:00	\N	\N	2025-08-27 15:17:23.592407
edbe2112-c917-4d9d-8cd8-fac670494f26	556677889900	medication	Labetalol 20mg IV push for BP > 160/110	active	Dr. Thompson	2025-08-27 10:45:00	\N	\N	2025-08-27 15:17:23.665723
3bd0fba9-045d-4e47-a719-41ac6d93d6ee	556677889900	procedure	Prepare for induction of labor	active	Dr. Thompson	2025-08-27 10:45:00	\N	\N	2025-08-27 15:17:23.739258
2591c444-5061-4979-b7b4-9e07efea2f32	556677889900	lab	CBC with platelets, LFTs, Uric Acid, Urine Protein/Creatinine Ratio	active	Dr. Thompson	2025-08-27 10:45:00	\N	\N	2025-08-27 15:17:23.812919
901832aa-5614-46b6-ae97-8a7c80d0da48	667788990011	activity	Ambulate as tolerated	active	Dr. Anderson	2025-08-27 11:15:00	\N	\N	2025-08-27 15:17:23.886855
a40b9559-4206-4e7f-8429-4a1f6f6922b9	667788990011	diet	Clear liquids	active	Dr. Anderson	2025-08-27 11:15:00	\N	\N	2025-08-27 15:17:23.961904
9ccc1b82-0be9-43d1-8f1d-d4bc47ddabae	667788990011	procedure	Continuous fetal monitoring	active	Dr. Anderson	2025-08-27 11:15:00	\N	\N	2025-08-27 15:17:24.035101
ff7a5300-7e4e-4bdd-9656-52340cc8780a	667788990011	medication	Saline lock. Consent for TOLAC and repeat C-section signed.	active	Dr. Anderson	2025-08-27 11:15:00	\N	\N	2025-08-27 15:17:24.108635
26cb6689-13de-4ee9-96e6-1ef98f0832af	667788990011	lab	Type & Screen	active	Dr. Anderson	2025-08-27 11:15:00	\N	\N	2025-08-27 15:17:24.181915
a8a69f5d-77d1-4137-9ac0-93d597975437	789123456789	diet	Breastfeeding on demand	active	Dr. Martinez	2025-08-27 10:52:00	\N	\N	2025-08-27 15:28:59.692115
62e7740b-938b-4dac-903e-87734bedd593	789123456789	medication	Vitamin K 1mg IM	completed	Dr. Martinez	2025-08-27 10:52:00	\N	\N	2025-08-27 15:28:59.692115
67fa739f-f116-4beb-a41f-08983571b749	789123456789	medication	Erythromycin eye ointment	completed	Dr. Martinez	2025-08-27 10:52:00	\N	\N	2025-08-27 15:28:59.692115
70b2e8ac-4425-44aa-9614-168e124d23ec	789123456789	procedure	Newborn screen at 24 hours of age	pending	Dr. Martinez	2025-08-27 10:52:00	\N	\N	2025-08-27 15:28:59.692115
fc961500-2395-4d21-9cfa-23844a3eeb5f	789123456789	procedure	Hearing screen at 24 hours of age	pending	Dr. Martinez	2025-08-27 10:52:00	\N	\N	2025-08-27 15:28:59.692115
553192a1-bedb-4599-a109-52d4a8816613	789123456789	procedure	CCHD screen at 24 hours of age	pending	Dr. Martinez	2025-08-27 10:52:00	\N	\N	2025-08-27 15:28:59.692115
2eaf3796-2617-428b-b0c9-4dded116d025	890234567890	diet	Formula feeding, 1-2 oz every 3-4 hours	active	Dr. Rodriguez	2025-08-27 11:01:00	\N	\N	2025-08-27 15:28:59.692115
7a2f7d9d-8de8-4575-ae8a-435f16ffb8b0	890234567890	medication	Vitamin K 1mg IM	completed	Dr. Rodriguez	2025-08-27 11:01:00	\N	\N	2025-08-27 15:28:59.692115
b77cc775-8d1b-4139-9c28-5f75a927775a	890234567890	medication	Erythromycin eye ointment	completed	Dr. Rodriguez	2025-08-27 11:01:00	\N	\N	2025-08-27 15:28:59.692115
fc73f22f-96d4-4178-803f-0f900ba74b38	890234567890	lab	Blood glucose check before first three feeds due to large size	active	Dr. Rodriguez	2025-08-27 11:01:00	\N	\N	2025-08-27 15:28:59.692115
c5350c75-fb36-4158-b0d5-b96a737abf5a	890234567890	procedure	Newborn screen at 24 hours of age	pending	Dr. Rodriguez	2025-08-27 11:01:00	\N	\N	2025-08-27 15:28:59.692115
a3943fb0-6d47-4302-8c26-4ec8f8be663c	890234567890	procedure	Hearing screen at 24 hours of age	pending	Dr. Rodriguez	2025-08-27 11:01:00	\N	\N	2025-08-27 15:28:59.692115
053e2f0a-39ca-491c-a81a-497e7512eb61	901345678901	activity	NICU transitional care	active	Dr. Kim	2025-08-27 09:42:00	\N	\N	2025-08-27 15:28:59.692115
07cdedcf-0d43-4050-8bee-aa9277af2878	901345678901	diet	Mother's expressed colostrum via syringe, then breast/bottle as tolerated	active	Dr. Kim	2025-08-27 09:42:00	\N	\N	2025-08-27 15:28:59.692115
6e767eb6-0a9c-420e-81a3-9c4b333f5fc9	901345678901	medication	Vitamin K 1mg IM	completed	Dr. Kim	2025-08-27 09:42:00	\N	\N	2025-08-27 15:28:59.692115
745afae6-00fd-4b82-960e-c9a33ab70262	901345678901	medication	Erythromycin eye ointment	completed	Dr. Kim	2025-08-27 09:42:00	\N	\N	2025-08-27 15:28:59.692115
f9c93251-b695-4e3d-9af4-9dac821ebc53	901345678901	lab	Glucose monitoring per twin protocol	active	Dr. Kim	2025-08-27 09:42:00	\N	\N	2025-08-27 15:28:59.692115
d223c34f-ae64-4158-afd0-37b39e31574d	901345678901	procedure	NICU assessment and monitoring	active	Dr. Kim	2025-08-27 09:42:00	\N	\N	2025-08-27 15:28:59.692115
f44ce72c-dcd9-44cb-b272-254ccc424672	012456789012	activity	NICU transitional care	active	Dr. Kim	2025-08-27 09:44:00	\N	\N	2025-08-27 15:28:59.692115
cc8889c7-6dd4-4524-8ccb-781a9cdd543a	012456789012	diet	Mother's expressed colostrum via syringe, then breast/bottle as tolerated	active	Dr. Kim	2025-08-27 09:44:00	\N	\N	2025-08-27 15:28:59.692115
38bd19a9-232e-4d41-abff-127e561634c9	012456789012	medication	Vitamin K 1mg IM	completed	Dr. Kim	2025-08-27 09:44:00	\N	\N	2025-08-27 15:28:59.692115
d913844f-9846-4dd6-b95e-523dd823e8e3	012456789012	medication	Erythromycin eye ointment	completed	Dr. Kim	2025-08-27 09:44:00	\N	\N	2025-08-27 15:28:59.692115
10c4515f-8e73-4943-a3fd-523942cd6991	012456789012	lab	Glucose monitoring per twin protocol	active	Dr. Kim	2025-08-27 09:44:00	\N	\N	2025-08-27 15:28:59.692115
4b81124d-d32a-4558-9269-c2c6e20d88e5	012456789012	procedure	NICU assessment and monitoring	active	Dr. Kim	2025-08-27 09:44:00	\N	\N	2025-08-27 15:28:59.692115
0433df2e-e634-463e-9255-01cdcc03050f	123456789123	activity	Up with assistance for first time	active	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
d13da89a-e4ea-4212-a52c-c6393aa439d3	123456789123	diet	Regular diet as tolerated	active	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
d08694d5-f9cd-46fa-b51e-edd04902870a	123456789123	medication	Ibuprofen 600mg PO q6h PRN pain	active	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
0d92f5b0-85a1-492c-83ba-87d2093d97c7	123456789123	medication	Docusate Sodium 100mg PO BID	active	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
067752b9-4280-4c7c-9e69-43e3289fd110	123456789123	procedure	Ice packs to perineum for 24 hours	active	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
5c7a41f1-8737-404f-a734-d7fcc86aff1d	123456789123	procedure	Monitor fundus and lochia	active	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
2990c917-650b-4bf3-b03c-33a447c685d0	123456789123	procedure	Perineal laceration care and assessment	active	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
03c6a666-f50b-423a-b95c-bb70b0846435	234567890123	diet	Breastfeeding on demand	active	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
3df7d04e-735f-4824-8018-9944f8a1467d	234567890123	medication	Vitamin K 1mg IM	completed	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
511a466f-bdb1-4e87-92e5-ae00d768f600	234567890123	medication	Erythromycin eye ointment	completed	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
a4e481f1-622f-4b23-9cc9-6fd9912e9b24	234567890123	lab	Cord blood sent for Type & Coombs test (due to Rh- mother)	pending	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
832e56ea-5fe8-4037-89fe-5a5a83152e7b	234567890123	procedure	Newborn screen at 24 hours of age	pending	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
8aa64d13-5cd6-4248-b195-ac75d70c5a29	234567890123	procedure	Hearing screen at 24 hours of age	pending	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
6ef34a14-ee19-4eeb-93cd-2436609e1a60	234567890123	procedure	CCHD screen at 24 hours of age	pending	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
71aa543b-ab1a-445e-8bfd-df968b2f306f	234567890123	procedure	Monitor for signs of hemolytic disease due to Rh incompatibility	active	Dr. Williams	2025-08-27 08:15:00	\N	\N	2025-08-27 15:33:08.986501
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (id, user_id, token, expires_at, created_at) FROM stdin;
7e7b5139-724b-4d67-bdb0-3f15276ea9c4	5db8b160-d752-4917-8b86-ed348802927f	bab04ff7-f345-4867-8d80-a9df146ba706	2025-08-28 10:40:55.648	2025-08-27 10:40:55.682062
d3b963dc-482c-4128-98f2-95cdf192a195	642ff1ea-3e74-417e-815b-c69b63b3e5f6	72213e7d-ee0f-4fb4-bfe7-27a38330084a	2025-08-28 10:54:53.846	2025-08-27 10:54:53.880827
c6dcd1c0-a3d9-44c7-898c-c3164eff45e0	642ff1ea-3e74-417e-815b-c69b63b3e5f6	05f89691-44e1-49b1-93ab-fff065a847bb	2025-08-28 11:02:20.518	2025-08-27 11:02:20.552912
057b5920-76da-444a-872f-975c0c4e6535	642ff1ea-3e74-417e-815b-c69b63b3e5f6	571ec7e5-a0da-4d47-b810-0f7a347fd82a	2025-08-28 11:06:18.773	2025-08-27 11:06:18.806619
32eafb76-10ae-433c-8a9f-1cdea92a1a36	642ff1ea-3e74-417e-815b-c69b63b3e5f6	3599110c-87a1-4e2f-94a1-91de0edf0a84	2025-08-28 11:10:45.687	2025-08-27 11:10:45.722252
54627c6c-512e-40b5-ae7c-ec78bc5f52c4	a1ae595d-4182-4fc8-825b-d905334a4158	f4eaee8a-6324-46a5-984b-6c218e52327c	2025-08-28 11:15:02.181	2025-08-27 11:15:02.213533
68cfbe37-78e4-45d4-a3ba-dd9396c401ed	a1ae595d-4182-4fc8-825b-d905334a4158	53682540-ab6a-423a-8b5f-c6c026a9f36d	2025-08-28 11:17:04.42	2025-08-27 11:17:04.452446
214a04a1-47ee-44e7-9d1e-0c0fe4869389	bed4e3e3-865a-4661-a920-abdc011e013b	d9e8462b-dc4f-4abd-8c56-77af3bda094b	2025-08-28 11:18:10.823	2025-08-27 11:18:10.857815
7011d357-8de9-451d-b09f-5afff0ad38e7	bed4e3e3-865a-4661-a920-abdc011e013b	b92d02bd-8560-4b7e-ac6b-4351b550d651	2025-08-28 11:23:22.226	2025-08-27 11:23:22.259777
72b2fe87-568d-4758-8186-a9576b53ad48	bed4e3e3-865a-4661-a920-abdc011e013b	21533070-eee2-49bc-b049-b79d6fb3a216	2025-08-28 11:27:11.962	2025-08-27 11:27:11.995087
41477073-bdac-4679-a50d-f48a92257b50	bed4e3e3-865a-4661-a920-abdc011e013b	212cc199-7997-4138-a78d-90ab5ca4f58d	2025-08-28 11:28:30.992	2025-08-27 11:28:31.027143
478f97ae-28b5-4dd4-b846-097f17d203dc	bed4e3e3-865a-4661-a920-abdc011e013b	581aa5fe-fab7-4997-b028-2e1e191f02dd	2025-08-28 11:28:58.149	2025-08-27 11:28:58.181626
c6cf74cd-d812-42dd-ae1f-1f4e4c9dc63e	bed4e3e3-865a-4661-a920-abdc011e013b	0a10da9e-af70-40e4-a650-267c4733a9a4	2025-08-28 11:50:01.517	2025-08-27 11:50:01.552119
57a78671-3c03-419b-87be-bf0b9d57767d	bed4e3e3-865a-4661-a920-abdc011e013b	f686497b-00c4-4bb5-a053-563a46c16c73	2025-08-28 11:52:23.539	2025-08-27 11:52:23.572952
a52fefe9-bf16-4005-a880-47975b104fa7	bed4e3e3-865a-4661-a920-abdc011e013b	a7a7381a-58e2-4dcf-bd17-123e1d062160	2025-08-28 12:23:29.285	2025-08-27 12:23:29.318583
e58a5608-79c5-465d-a3fc-25f48972a23c	bed4e3e3-865a-4661-a920-abdc011e013b	5f5d4ad4-3b1b-4d62-9dd6-b0c6c5dc800f	2025-08-28 12:30:00.181	2025-08-27 12:30:00.216155
544af334-0531-450a-b734-c21410ceb7b1	bed4e3e3-865a-4661-a920-abdc011e013b	00cc47cb-358f-4210-a1ea-e4018ab09cb5	2025-08-28 12:39:28.267	2025-08-27 12:39:28.302028
5152a39b-5a4f-4185-b393-5b7428270b44	bed4e3e3-865a-4661-a920-abdc011e013b	e6ef6c0f-74f4-49c6-83d4-a7bfd7dccb78	2025-08-28 12:46:17.407	2025-08-27 12:46:17.440456
efe85eb3-444b-4229-a6f4-bcbb4fdb1e7e	bed4e3e3-865a-4661-a920-abdc011e013b	a9d8d583-3735-48a1-b70d-651326d8d320	2025-08-28 12:51:51.845	2025-08-27 12:51:51.880007
5f8d6043-2180-4dc0-b8f3-8b6784a0b5da	bed4e3e3-865a-4661-a920-abdc011e013b	51ccdbde-8595-4df2-809b-d0328a8d9b83	2025-08-28 12:58:40.683	2025-08-27 12:58:40.718065
09820b6f-863e-486d-870d-ecce8a794f0b	642ff1ea-3e74-417e-815b-c69b63b3e5f6	f135aefa-20a8-4b3d-b69b-f4e850ceede4	2025-08-28 13:07:08.732	2025-08-27 13:07:08.764871
7d65b933-06cd-426a-a198-845b0636794a	642ff1ea-3e74-417e-815b-c69b63b3e5f6	305b9240-3f44-4e65-98c9-5e67e36c0868	2025-08-28 13:15:05.45	2025-08-27 13:15:05.484617
d6599f20-b338-41e5-8e73-d31d07efae32	642ff1ea-3e74-417e-815b-c69b63b3e5f6	8eba4829-e406-4bd6-bde0-e24d78c93ae9	2025-08-28 13:16:23.066	2025-08-27 13:16:23.100845
7062e2fa-54bb-482e-b806-634a0fa85459	642ff1ea-3e74-417e-815b-c69b63b3e5f6	60e8095f-7cc1-46b0-80e3-fba6f3ea7d73	2025-08-28 13:20:57.723	2025-08-27 13:20:57.758268
65f90a3f-684d-4aef-bdde-af9074f307a5	642ff1ea-3e74-417e-815b-c69b63b3e5f6	0b0621ca-a8dc-425e-896f-39387c81d441	2025-08-28 13:23:31.594	2025-08-27 13:23:31.62931
7752a331-323d-4808-b610-177d9ef4b1df	a1ae595d-4182-4fc8-825b-d905334a4158	dcf96ecc-74a1-461c-bf12-908bde10595a	2025-08-28 13:27:19.474	2025-08-27 13:27:19.50904
0519ca95-1a66-4200-ba02-0ad2e49b06d2	bed4e3e3-865a-4661-a920-abdc011e013b	ae3a7805-530c-46cc-a8bd-2e5f44572e4e	2025-08-28 13:30:53.779	2025-08-27 13:30:53.81468
5771d1f4-2063-475a-881d-effded2bdabc	bed4e3e3-865a-4661-a920-abdc011e013b	1022c8d4-9272-46fc-a1df-ca745fc248f4	2025-08-28 13:34:48.901	2025-08-27 13:34:48.935342
4a7dfdb7-4ac3-40f0-a1db-47e77bf5e1a8	bed4e3e3-865a-4661-a920-abdc011e013b	09e91cbd-90dd-429f-8d21-5943ade66f1b	2025-08-28 13:38:59.618	2025-08-27 13:38:59.653239
9b7bb656-70ac-4da4-ba16-7ab624445c07	bed4e3e3-865a-4661-a920-abdc011e013b	5fe56655-4de1-4f0c-a037-6deed2da338b	2025-08-28 13:39:31.99	2025-08-27 13:39:32.02416
8b366506-0f08-48d8-8534-f841fb255e73	bed4e3e3-865a-4661-a920-abdc011e013b	e0a68162-04c5-4d7b-a14f-9e6134872b49	2025-08-28 13:48:23.815	2025-08-27 13:48:23.849908
7688c179-5562-4cfe-b252-8d6d1a578406	bed4e3e3-865a-4661-a920-abdc011e013b	e8b7af4d-f1c7-42fe-991d-b5d4221aa50a	2025-08-28 13:57:27.138	2025-08-27 13:57:27.172188
1257d114-3546-4a77-9c11-32376ad93cdb	bed4e3e3-865a-4661-a920-abdc011e013b	1187af5b-5eaf-4bf9-9973-85116ddad907	2025-08-28 14:00:26.264	2025-08-27 14:00:26.29912
965abe4d-9acc-429c-8ad1-1fa790841a1a	bed4e3e3-865a-4661-a920-abdc011e013b	d8a26050-0df5-43fd-b890-65c9e97c0f00	2025-08-28 14:02:09.973	2025-08-27 14:02:10.00673
b71c0e4d-c928-4981-b075-e811b063a808	bed4e3e3-865a-4661-a920-abdc011e013b	1228dc3a-19df-4c01-a470-a58e601a61c8	2025-08-28 14:06:59.123	2025-08-27 14:06:59.158329
914f60ef-e820-4926-bfd7-5deb8d74567c	bed4e3e3-865a-4661-a920-abdc011e013b	8bf2aa06-ef4f-484f-b82b-b8044bf97e79	2025-08-28 14:21:32.552	2025-08-27 14:21:32.587874
cc1058b6-98b4-4efa-88b4-3692bcf65acb	bed4e3e3-865a-4661-a920-abdc011e013b	c2dcadfc-3192-4fc5-a080-726d966e3793	2025-08-28 14:26:44.104	2025-08-27 14:26:44.138924
85c45c26-795f-4486-be89-739258869809	bed4e3e3-865a-4661-a920-abdc011e013b	f14017c3-c348-4b66-839f-00ae1b0645f9	2025-08-28 14:32:14.65	2025-08-27 14:32:14.685262
f98ecade-9431-4c5a-b075-dd76a2e3bff7	bed4e3e3-865a-4661-a920-abdc011e013b	27e420a2-e7e3-49c5-81cc-761617a12e73	2025-08-28 14:35:01.657	2025-08-27 14:35:01.692298
d8586630-896e-4194-805d-fb5cb2d967a0	bed4e3e3-865a-4661-a920-abdc011e013b	fd167e9f-2eb4-4802-9e63-8ceaf1e6e1ca	2025-08-28 14:45:45.818	2025-08-27 14:45:45.852506
7a8156f6-0bc9-461c-bb02-2200a86b373a	bed4e3e3-865a-4661-a920-abdc011e013b	912cae1e-3410-4a75-9037-76a40769033d	2025-08-28 14:56:04.734	2025-08-27 14:56:04.76948
0fa7c95f-670e-44b6-bac4-43a08ad989dc	bed4e3e3-865a-4661-a920-abdc011e013b	fc773c41-53c7-415e-b93f-820769bc30da	2025-08-28 15:00:13.242	2025-08-27 15:00:13.276303
5f31a9c9-5adc-4b8f-a2bd-80e6cfa845bf	bed4e3e3-865a-4661-a920-abdc011e013b	70b5ee06-46ae-4253-a737-71fef0910c68	2025-08-28 15:16:55.954	2025-08-27 15:16:55.989684
32124beb-1ed0-4a95-894a-2789ca849b00	bed4e3e3-865a-4661-a920-abdc011e013b	ecb8c514-899c-427c-aea9-2ab99a9d32cc	2025-08-28 15:21:56.138	2025-08-27 15:21:56.171837
00dfd306-1184-4ed9-8d83-c02fa52388dd	bed4e3e3-865a-4661-a920-abdc011e013b	4d1c1c3b-f902-4f22-8ec1-8fd7df9b76bf	2025-08-28 15:29:49.399	2025-08-27 15:29:49.434923
030cdba8-63df-44e9-a670-d54f79e6b3c7	bed4e3e3-865a-4661-a920-abdc011e013b	7c68e3e4-8ce5-4c68-b450-92503fdd48d0	2025-08-28 15:50:37.731	2025-08-27 15:50:37.767234
89308f5f-16d6-4a91-8ef1-d603e8b67483	bed4e3e3-865a-4661-a920-abdc011e013b	12da1501-d1f1-4456-adbb-3ecbe3cae6d9	2025-08-28 15:51:56.184	2025-08-27 15:51:56.216814
76109249-bcef-4e52-81fa-168487909b08	bed4e3e3-865a-4661-a920-abdc011e013b	edc61186-b1b7-4cd7-ba78-cf8cdfeef032	2025-08-28 15:58:27.228	2025-08-27 15:58:27.262056
28e69369-e670-4a20-9faf-2250889a1bc5	bed4e3e3-865a-4661-a920-abdc011e013b	d9af1582-4b48-406e-af15-e37931ebf9ac	2025-08-28 16:02:43.558	2025-08-27 16:02:43.593374
2462cb05-a0ff-4b7b-bfe5-830f7a662ce8	bed4e3e3-865a-4661-a920-abdc011e013b	93b6b58d-98b9-47a9-887e-1c4b85cfe8ce	2025-08-28 16:06:54.419	2025-08-27 16:06:54.456571
7bafd215-f77a-42a0-a24c-ac577e8f3407	bed4e3e3-865a-4661-a920-abdc011e013b	88f91289-28b2-4b7d-ade5-4a2edb3f2786	2025-08-28 16:10:31.462	2025-08-27 16:10:31.497452
174808d5-5997-4833-9601-0fb70be3fd04	bed4e3e3-865a-4661-a920-abdc011e013b	654dbb5c-bb64-4488-9b74-8e6021564452	2025-08-28 16:17:23.747	2025-08-27 16:17:23.782278
8d827412-d9c7-49d6-a389-9f8e2817607d	bed4e3e3-865a-4661-a920-abdc011e013b	ea538c03-39bc-4b10-9e3f-f5200d7de90c	2025-08-28 16:25:09.165	2025-08-27 16:25:09.200835
9cce2008-1819-40b2-b584-9015bf7b53b6	bed4e3e3-865a-4661-a920-abdc011e013b	3cc1575f-0a59-4934-ba14-d8ad1a84c757	2025-08-28 17:45:16.523	2025-08-27 17:45:16.558423
e2fb118e-89a6-43eb-ab98-280d90203795	bed4e3e3-865a-4661-a920-abdc011e013b	7a90aacb-ba95-4dd4-8bd0-a490cb619a6f	2025-08-28 17:45:52.966	2025-08-27 17:45:53.00094
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, pin, role, created_at) FROM stdin;
5db8b160-d752-4917-8b86-ed348802927f	Instructor	112794	instructor	2025-08-27 10:33:48.745297
1a861847-96aa-4399-b401-7efeb0f6161b	Student 1	112233	student	2025-08-27 10:33:48.904157
28461871-352d-47a2-9f5c-20aad553f813	Student 2	112234	student	2025-08-27 10:33:49.055516
a1ae595d-4182-4fc8-825b-d905334a4158	instructor	112794	instructor	2025-08-27 10:42:01.026975
642ff1ea-3e74-417e-815b-c69b63b3e5f6	student1	112233	student	2025-08-27 10:42:01.178503
debedc6a-f451-4a43-9e19-9dd533e386e0	student2	112234	student	2025-08-27 10:42:01.326898
bed4e3e3-865a-4661-a920-abdc011e013b	a	0000	admin	2025-08-27 11:11:26.418649
\.


--
-- Data for Name: vitals; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.vitals (id, patient_id, pulse, temperature, respiration_rate, blood_pressure_systolic, blood_pressure_diastolic, oxygen_saturation, notes, taken_at, taken_by, created_at) FROM stdin;
\.


--
-- Name: administrations administrations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.administrations
    ADD CONSTRAINT administrations_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: care_notes care_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.care_notes
    ADD CONSTRAINT care_notes_pkey PRIMARY KEY (id);


--
-- Name: care_plans care_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.care_plans
    ADD CONSTRAINT care_plans_pkey PRIMARY KEY (id);


--
-- Name: imaging_files imaging_files_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imaging_files
    ADD CONSTRAINT imaging_files_pkey PRIMARY KEY (id);


--
-- Name: intake_output intake_output_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.intake_output
    ADD CONSTRAINT intake_output_pkey PRIMARY KEY (id);


--
-- Name: lab_results lab_results_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_pkey PRIMARY KEY (id);


--
-- Name: lab_test_types lab_test_types_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_test_types
    ADD CONSTRAINT lab_test_types_code_unique UNIQUE (code);


--
-- Name: lab_test_types lab_test_types_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_test_types
    ADD CONSTRAINT lab_test_types_pkey PRIMARY KEY (id);


--
-- Name: medicines medicines_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.medicines
    ADD CONSTRAINT medicines_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: provider_orders provider_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.provider_orders
    ADD CONSTRAINT provider_orders_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_unique UNIQUE (token);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: vitals vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_pkey PRIMARY KEY (id);


--
-- Name: administrations administrations_medicine_id_medicines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.administrations
    ADD CONSTRAINT administrations_medicine_id_medicines_id_fk FOREIGN KEY (medicine_id) REFERENCES public.medicines(id);


--
-- Name: administrations administrations_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.administrations
    ADD CONSTRAINT administrations_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: assessments assessments_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: care_notes care_notes_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.care_notes
    ADD CONSTRAINT care_notes_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: care_plans care_plans_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.care_plans
    ADD CONSTRAINT care_plans_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: imaging_files imaging_files_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imaging_files
    ADD CONSTRAINT imaging_files_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: intake_output intake_output_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.intake_output
    ADD CONSTRAINT intake_output_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: lab_results lab_results_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lab_results
    ADD CONSTRAINT lab_results_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: prescriptions prescriptions_medicine_id_medicines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_medicine_id_medicines_id_fk FOREIGN KEY (medicine_id) REFERENCES public.medicines(id);


--
-- Name: prescriptions prescriptions_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: provider_orders provider_orders_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.provider_orders
    ADD CONSTRAINT provider_orders_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: vitals vitals_patient_id_patients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.vitals
    ADD CONSTRAINT vitals_patient_id_patients_id_fk FOREIGN KEY (patient_id) REFERENCES public.patients(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

