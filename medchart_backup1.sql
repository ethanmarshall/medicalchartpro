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
80570241-e1d9-4add-84c6-9bd6289507da	patient	901345678901	update	{"age":0,"doseWeight":"2.6 kg","isolation":"None","bed":"NICU-01","allergies":"None","status":"Observation","provider":"Dr. Kim","notes":"BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\\nGESTATION: 37 weeks 5 days (late preterm)\\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)"}	2025-08-27 19:05:17.485335	bed4e3e3-865a-4661-a920-abdc011e013b
e7b3e78f-5c49-40fb-aae5-9d5e660e4c4c	patient	901345678901	update	{"updated_fields":["age","doseWeight","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":0,"to":0},"doseWeight":{"from":"2.6 kg","to":"2.6 kg"},"isolation":{"from":"None","to":"None"},"bed":{"from":"NICU-01","to":"NICU-01"},"allergies":{"from":"None","to":"None"},"status":{"from":"Observation","to":"Observation"},"provider":{"from":"Dr. Kim","to":"Dr. Kim"},"notes":{"from":"BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\\nGESTATION: 37 weeks 5 days (late preterm)\\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)","to":"BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\\nGESTATION: 37 weeks 5 days (late preterm)\\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)"}},"updatedBy":"a"}	2025-08-27 19:05:17.565247	bed4e3e3-865a-4661-a920-abdc011e013b
a03feb1c-7808-4030-9405-8189a58a0eb4	patient	334455667788	update	{"age":31,"doseWeight":"68 kg","isolation":"None","bed":"LD-03","allergies":"None","status":"Postpartum Recovery","provider":"Dr. Kim","notes":"ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+."}	2025-08-27 19:07:07.496825	bed4e3e3-865a-4661-a920-abdc011e013b
f3c4444d-7eb7-4807-8583-42d471ed8b96	patient	334455667788	update	{"updated_fields":["age","doseWeight","isolation","bed","allergies","status","provider","notes"],"changes":{"age":{"from":31,"to":31},"doseWeight":{"from":"68 kg","to":"68 kg"},"isolation":{"from":"None","to":"None"},"bed":{"from":"LD-03","to":"LD-03"},"allergies":{"from":"None","to":"None"},"status":{"from":"Postpartum / Couplet Care","to":"Postpartum Recovery"},"provider":{"from":"Dr. Kim","to":"Dr. Kim"},"notes":{"from":"ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+.","to":"ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+."}},"updatedBy":"a"}	2025-08-27 19:07:07.562952	bed4e3e3-865a-4661-a920-abdc011e013b
c837d58d-8ba2-451a-86b9-21e738e796e7	prescription	bf2cc1c2-cf33-4035-9f97-5909d5d39f80	create	{"patientId":"334455667788","medicineId":"20000004","dosage":"2 tabs","periodicity":"As needed","duration":"As needed","route":"Oral","startDate":"2025-08-27T00:00:00.000Z","endDate":null}	2025-08-27 19:12:05.38964	\N
b7d6aac0-fbe3-4be0-bbe3-ad0a11db9892	prescription	bf2cc1c2-cf33-4035-9f97-5909d5d39f80	create	{"patient_id":"334455667788","medicine_id":"20000004","action":"prescription_added"}	2025-08-27 19:12:05.457204	\N
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
d97daf6a-7939-4b4d-8c06-dee81d60724f	112233445566	Complete Blood Count - Hemoglobin	12.5	g/dL	12.0-16.0 g/dL	normal	2025-08-27 21:03:32.407574	CBC-HGB	2025-08-25 08:00:00	2025-08-25 10:30:00	Hemoglobin within normal limits
59178708-4dfd-490b-99ef-a679fe34a9e2	112233445566	Complete Blood Count - White Blood Cells	7200	cells/μL	4500-11000 cells/μL	normal	2025-08-27 21:03:32.476457	CBC-WBC	2025-08-25 08:00:00	2025-08-25 10:30:00	\N
011b64a5-f420-45d3-9f98-1fc43cd7e7a3	112233445566	Basic Metabolic Panel - Glucose	95	mg/dL	70-100 mg/dL	normal	2025-08-27 21:03:32.542999	BMP-GLU	2025-08-25 08:00:00	2025-08-25 09:45:00	Fasting glucose normal
6308a024-4b17-403b-8c59-c57176b6db63	112233445566	Basic Metabolic Panel - Creatinine	0.9	mg/dL	0.6-1.2 mg/dL	normal	2025-08-27 21:03:32.609413	BMP-CREAT	2025-08-25 08:00:00	2025-08-25 09:45:00	Kidney function normal
ccb784d3-dafc-4444-ba66-bb7fa159bd75	112233445566	Hemoglobin A1C	5.8	%	<7.0%	normal	2025-08-27 21:03:32.675877	HbA1c	2025-08-20 09:00:00	2025-08-21 14:00:00	Good diabetic control
aad9b48a-f133-4eeb-bf86-5727093aa9c3	223344556677	Lipid Panel - Total Cholesterol	220	mg/dL	<200 mg/dL	abnormal	2025-08-27 21:03:32.741271	LIPID-CHOL	2025-08-24 10:30:00	2025-08-24 15:00:00	Elevated cholesterol, recommend dietary changes
78c37d35-9e74-45b7-a7b1-6551f76f9ff7	223344556677	Lipid Panel - LDL Cholesterol	145	mg/dL	<100 mg/dL	abnormal	2025-08-27 21:03:32.808336	LIPID-LDL	2025-08-24 10:30:00	2025-08-24 15:00:00	LDL elevated
8b8f91a2-a4d3-49da-a389-8e8387ab9cb9	223344556677	Lipid Panel - HDL Cholesterol	38	mg/dL	>40 mg/dL (M), >50 mg/dL (F)	abnormal	2025-08-27 21:03:32.874515	LIPID-HDL	2025-08-24 10:30:00	2025-08-24 15:00:00	HDL low, consider exercise
5852f9b8-49fa-422f-85f6-ccbcc1773ab9	223344556677	Thyroid Stimulating Hormone	2.1	mIU/L	0.4-4.0 mIU/L	normal	2025-08-27 21:03:32.941068	TSH	2025-08-24 10:30:00	2025-08-24 16:30:00	Thyroid function normal
29746faa-64de-4c81-adfd-5a5f4800e4bf	223344556677	Prostate Specific Antigen	1.8	ng/mL	<4.0 ng/mL	normal	2025-08-27 21:03:33.007338	PSA	2025-08-22 08:00:00	2025-08-22 14:00:00	Annual screening - normal
\.


--
-- Data for Name: lab_test_types; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.lab_test_types (id, code, name, category, unit, reference_range, is_active, created_at) FROM stdin;
429e2587-f36c-49ba-8745-0bc8c944c4ec	CBC-HGB	Complete Blood Count - Hemoglobin	Hematology	g/dL	12.0-16.0 g/dL	1	2025-08-27 21:03:31.730017
c0ba9186-18a1-4fa0-a3a2-587063d7626f	CBC-WBC	Complete Blood Count - White Blood Cells	Hematology	cells/μL	4500-11000 cells/μL	1	2025-08-27 21:03:31.804805
d9593c5b-fb0c-4259-ae99-64e0bc7b2b0d	BMP-GLU	Basic Metabolic Panel - Glucose	Chemistry	mg/dL	70-100 mg/dL	1	2025-08-27 21:03:31.87078
485bdadd-3170-40c4-8f17-2f29cc036e12	BMP-CREAT	Basic Metabolic Panel - Creatinine	Chemistry	mg/dL	0.6-1.2 mg/dL	1	2025-08-27 21:03:31.943223
425ccab1-ef06-4eee-b60f-149b81d7662b	HbA1c	Hemoglobin A1C	Endocrinology	%	<7.0%	1	2025-08-27 21:03:32.009767
ff7cb645-11c8-4321-8eef-5a12db21b310	LIPID-CHOL	Lipid Panel - Total Cholesterol	Chemistry	mg/dL	<200 mg/dL	1	2025-08-27 21:03:32.076227
fd07dee3-304a-45b1-8d3a-178e9585a29e	LIPID-LDL	Lipid Panel - LDL Cholesterol	Chemistry	mg/dL	<100 mg/dL	1	2025-08-27 21:03:32.142685
5ef465db-d69e-4cec-bd2c-ef3ff3d41e72	LIPID-HDL	Lipid Panel - HDL Cholesterol	Chemistry	mg/dL	>40 mg/dL (M), >50 mg/dL (F)	1	2025-08-27 21:03:32.208322
7834bd1a-a493-4a8b-a4e0-9810465a6f35	TSH	Thyroid Stimulating Hormone	Endocrinology	mIU/L	0.4-4.0 mIU/L	1	2025-08-27 21:03:32.274581
512be01e-f34b-4f00-8a9a-36e8fb96e748	PSA	Prostate Specific Antigen	Endocrinology	ng/mL	<4.0 ng/mL	1	2025-08-27 21:03:32.340869
\.


--
-- Data for Name: medicines; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.medicines (id, name, drawer, bin) FROM stdin;
31908432	Acetaminophen	A1	01
95283134	Ibuprofen	A1	01
60329247	Amoxicillin	A1	01
09509828	Metformin	A1	01
20944348	Lisinopril	A1	01
10000009	Acetaminophen 325 mg	A1	01
20000004	Ibuprofen 200 mg	A1	01
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.patients (id, name, dob, age, dose_weight, sex, mrn, fin, admitted, isolation, bed, allergies, status, provider, notes, department, chart_data, created_at) FROM stdin;
112233445566	Olivia Smith	1997-03-15	28	65 kg	Female	MN-456789123	FN-456789123	2025-08-27	None	LD-102	None	Active Labor	Dr. Martinez	ADMISSION: 08/27/2025 @ 06:30 for spontaneous rupture of membranes (SROM) with clear fluid, active labor.\n\nLABOR STATUS: G1 P0, 39 weeks 4 days gestation. Cervix 4 cm dilated, 90% effaced, -1 station. Membranes ruptured. Contractions every 3-4 minutes, lasting 60 seconds, moderate intensity.\n\nMEDICAL HISTORY: Uncomplicated prenatal course. GBS negative. Blood Type: O+.	Labor & Delivery	{"background":"First-time mother (G1 P0) at 39 weeks 4 days gestation admitted in active labor.","summary":"Low-risk first-time mother progressing well in labor with clear amniotic fluid.","discharge":"To be determined based on delivery outcome.","handoff":"Active labor patient, monitor cervical dilation and fetal heart tones."}	2025-08-27 21:03:30.051686
223344556677	Maria Garcia	1991-02-14	34	70 kg	Female	MN-789123456	FN-789123456	2025-08-27	None	LD-104	Penicillin (rash)	Induction	Dr. Rodriguez	ADMISSION: 08/27/2025 @ 08:00 for scheduled induction for post-term pregnancy.\n\nLABOR STATUS: G3 P2, 41 weeks 1 day gestation. Cervix 1 cm dilated, 50% effaced, -3 station. Membranes intact. Contractions irregular, mild Braxton Hicks.\n\nMEDICAL HISTORY: Two previous spontaneous vaginal deliveries. Iron-deficiency anemia. Blood Type: A-.	Labor & Delivery	{"background":"Multigravida (G3 P2) patient at 41 weeks 1 day gestation for scheduled induction.","summary":"Post-term pregnancy requiring induction with history of uncomplicated deliveries.","discharge":"To be determined based on delivery outcome.","handoff":"Patient scheduled for induction, monitor response to Pitocin and fetal tolerance."}	2025-08-27 21:03:30.126419
334455667788	Emily Chen	1993-09-12	31	68 kg	Female	MN-123456789	FN-123456789	2025-08-27	None	OR-3	None	Pre-operative	Dr. Kim	ADMISSION: 08/27/2025 @ 09:00 for scheduled Cesarean section for dichorionic-diamniotic twin pregnancy with Twin A in breech presentation.\n\nLABOR STATUS: G1 P0, 37 weeks 5 days gestation. Cervix closed, long, posterior. Membranes intact. No contractions.\n\nMEDICAL HISTORY: Gestational Diabetes, diet-controlled. Blood Type: B+.	Labor & Delivery	{"background":"Primigravida with dichorionic-diamniotic twins scheduled for Cesarean delivery.","summary":"Twin pregnancy at term equivalent with breech presentation requiring surgical delivery.","discharge":"To be determined post-operatively.","handoff":"Pre-operative patient for scheduled C-section, twins require NICU evaluation."}	2025-08-27 21:03:30.196758
445566778899	Aisha Williams	2000-12-10	24	58 kg	Female	MN-987654321	FN-987654321	2025-08-27	None	LD-106	None	Preterm Labor	Dr. Johnson	ADMISSION: 08/27/2025 @ 02:15 for reports of regular, painful contractions.\n\nLABOR STATUS: G2 P1, 33 weeks 2 days gestation. Cervix 2 cm dilated, 75% effaced, -2 station. Membranes intact. Contractions every 5-7 minutes, lasting 45 seconds.\n\nMEDICAL HISTORY: Previous preterm delivery at 35 weeks. Blood Type: AB+.	Labor & Delivery	{"background":"Multigravida with history of preterm delivery presenting with preterm labor.","summary":"Preterm labor at 33 weeks requiring tocolysis and fetal neuroprotection.","discharge":"To be determined based on response to treatment.","handoff":"Preterm labor patient on strict bed rest with magnesium sulfate and betamethasone."}	2025-08-27 21:03:30.26479
556677889900	Sophia Miller	1987-06-25	37	72 kg	Female	MN-654321987	FN-654321987	2025-08-27	Seizure Precautions	LD-108	Codeine (nausea)	Severe Preeclampsia	Dr. Thompson	ADMISSION: 08/27/2025 @ 10:45 for elevated blood pressure (165/112) and proteinuria at routine appointment. Reports headache and visual spots.\n\nLABOR STATUS: G1 P0, 36 weeks 0 days gestation. Cervix unfavorable, closed. Membranes intact. No contractions.\n\nMEDICAL HISTORY: Chronic hypertension. Blood Type: O-.	Labor & Delivery	{"background":"Primigravida with chronic hypertension developing severe preeclampsia.","summary":"Severe preeclampsia requiring magnesium sulfate and delivery planning.","discharge":"To be determined based on maternal and fetal status.","handoff":"Patient on seizure precautions with magnesium sulfate, monitor BP and symptoms."}	2025-08-27 21:03:30.331813
667788990011	Chloe Johnson	1992-04-18	32	64 kg	Female	MN-555444333	FN-555444333	2025-08-27	None	LD-110	Sulfa drugs (hives)	TOLAC	Dr. Anderson	ADMISSION: 08/27/2025 @ 11:15 for spontaneous active labor, desires Trial of Labor After Cesarean (TOLAC).\n\nLABOR STATUS: G2 P1, 40 weeks 2 days gestation. Cervix 5 cm dilated, 100% effaced, 0 station. Membranes intact. Contractions every 3 minutes, lasting 60-70 seconds, strong intensity.\n\nMEDICAL HISTORY: One previous C-section for fetal distress. Confirmed low transverse uterine incision. Blood Type: A+.	Labor & Delivery	{"background":"VBAC candidate with previous low transverse C-section in active labor.","summary":"Trial of Labor After Cesarean with favorable cervical exam and strong labor pattern.","discharge":"To be determined based on labor progress and TOLAC success.","handoff":"TOLAC patient requiring continuous monitoring, consent signed for repeat C-section if needed."}	2025-08-27 21:03:30.399317
789123456789	Baby Boy Smith	2025-08-27	0	3.4 kg	Male	MN-987654321098	FN-987654321098	2025-08-27	None	NB-03	None	Observation	Dr. Martinez	BIRTH: 08/27/2025 @ 10:52, Spontaneous Vaginal Delivery\n\nPARENT: Olivia Smith (MRN: MN-456789123)\n\nGESTATION: 39 weeks 4 days\n\nBIRTH DETAILS: Birth Weight 3.4 kg (7 lbs 8 oz), Length 51 cm. APGAR Scores: 8 (1 min), 9 (5 min)\n\nVITALS: T: 37.0°C, HR: 145, RR: 50\n\nCARE PLAN: Breastfeeding on demand, routine newborn care	Newborn	{"background":"Term newborn male delivered via spontaneous vaginal delivery to primigravida mother.","summary":"Healthy term newborn with excellent APGAR scores, stable vital signs.","discharge":"Pending completion of newborn screenings and feeding establishment.","handoff":"Stable newborn requiring routine care and screenings."}	2025-08-27 21:03:30.465754
890234567890	Baby Girl Garcia	2025-08-27	0	4.0 kg	Female	MN-876543210987	FN-876543210987	2025-08-27	None	NB-02	None	Observation	Dr. Rodriguez	BIRTH: 08/27/2025 @ 11:01, Pitocin-augmented Vaginal Delivery\n\nPARENT: Maria Garcia (MRN: MN-789123456)\n\nGESTATION: 41 weeks 1 day (post-term)\n\nBIRTH DETAILS: Birth Weight 4.0 kg (8 lbs 13 oz), Length 53 cm. APGAR Scores: 9 (1 min), 9 (5 min)\n\nVITALS: T: 36.8°C, HR: 150, RR: 48. Note: Mild peeling skin, common for post-term infants\n\nCARE PLAN: Formula feeding 1-2 oz every 3-4 hours, glucose monitoring due to large size	Newborn	{"background":"Post-term newborn female delivered via augmented vaginal delivery, large for gestational age.","summary":"Post-term large newborn with excellent APGAR scores requiring glucose monitoring.","discharge":"Pending stable glucose levels and feeding tolerance.","handoff":"Large post-term newborn requiring glucose monitoring before first three feeds."}	2025-08-27 21:03:30.532574
901345678901	Baby A Chen (Twin 1)	2025-08-27	0	2.6 kg	Female	334455667789	334455667789	2025-08-27	None	NB-04	None	Observation	Dr. Kim	BIRTH: 08/27/2025 @ 09:42, Scheduled Cesarean Section (Twin A)\n\nPARENT: Emily Chen (MRN: MN-123456789)\n\nGESTATION: 37 weeks 5 days (late preterm)\n\nBIRTH DETAILS: Birth Weight 2.6 kg (5 lbs 12 oz), Length 47 cm. APGAR Scores: 7 (1 min), 9 (5 min)\n\nVITALS: T: 36.6°C, HR: 155, RR: 58\n\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother's expressed colostrum via syringe, then breast/bottle as tolerated	Newborn	{"background":"Late preterm twin A delivered via scheduled Cesarean section, requiring NICU care.","summary":"Twin A requiring transitional care for late preterm status and glucose monitoring.","discharge":"Pending stable transition and feeding establishment.","handoff":"Twin A in NICU for transitional care, glucose monitoring, and feeding support."}	2025-08-27 21:03:30.59914
012456789012	Baby B Chen (Twin 2)	2025-08-27	0	2.8 kg	Male	334455667788	334455667788	2025-08-27	None	NB-05	None	Observation	Dr. Kim	BIRTH: 08/27/2025 @ 09:44, Scheduled Cesarean Section (Twin B)\n\nPARENT: Emily Chen (MRN: MN-123456789)\n\nGESTATION: 37 weeks 5 days (late preterm)\n\nBIRTH DETAILS: Birth Weight 2.8 kg (6 lbs 3 oz), Length 48 cm. APGAR Scores: 8 (1 min), 9 (5 min)\n\nVITALS: T: 36.7°C, HR: 148, RR: 54\n\nCARE PLAN: NICU for transitional care and glucose monitoring per twin protocol. Mother's expressed colostrum via syringe, then breast/bottle as tolerated	Newborn	{"background":"Late preterm twin B delivered via scheduled Cesarean section, requiring NICU care.","summary":"Twin B requiring transitional care for late preterm status and glucose monitoring.","discharge":"Pending stable transition and feeding establishment.","handoff":"Twin B in NICU for transitional care, glucose monitoring, and feeding support."}	2025-08-27 21:03:30.666105
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
7	334455667788	10000009	325 mg	Every 6 hours	10 days	2025-08-27 00:00:00	2025-09-05 00:00:00	Oral
8	334455667788	20000004	2 tabs	As needed	As needed	2025-08-27 00:00:00	\N	Oral
\.


--
-- Data for Name: provider_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.provider_orders (id, patient_id, order_type, description, status, ordered_by, ordered_at, discontinued_at, discontinued_by, created_at) FROM stdin;
ac34a01d-2ec7-4e20-a03c-695ed0521fec	112233445566	activity	Ambulate as tolerated	active	Dr. Martinez	2025-08-27 06:30:00	\N	\N	2025-08-27 21:03:33.073669
e55d336f-51fe-4b32-b53c-294190ef932a	112233445566	diet	Clear liquids	active	Dr. Martinez	2025-08-27 06:30:00	\N	\N	2025-08-27 21:03:33.145051
056a8ef4-3513-4753-b8a2-c2e378b9f2dc	112233445566	procedure	Continuous fetal monitoring	active	Dr. Martinez	2025-08-27 06:30:00	\N	\N	2025-08-27 21:03:33.211466
287122a2-7bcf-43b6-8ad3-0566e9c7d7bc	112233445566	medication	Saline lock. Awaiting request for epidural.	active	Dr. Martinez	2025-08-27 06:30:00	\N	\N	2025-08-27 21:03:33.278084
3f8a7896-74d7-4b5f-b415-d3a872029583	223344556677	diet	Regular diet until active labor begins	active	Dr. Rodriguez	2025-08-27 08:00:00	\N	\N	2025-08-27 21:03:33.344534
ec3ef975-99b1-44b2-8876-bbfccfb99ad8	223344556677	medication	Begin Pitocin infusion per protocol	active	Dr. Rodriguez	2025-08-27 08:00:00	\N	\N	2025-08-27 21:03:33.411493
e7c225c2-32ea-4f73-a581-5a5d99747681	223344556677	procedure	Continuous fetal monitoring once Pitocin is initiated	active	Dr. Rodriguez	2025-08-27 08:00:00	\N	\N	2025-08-27 21:03:33.480575
a0f11d6f-b0f1-4371-b9f8-62ac7411cea7	223344556677	lab	CBC, Type & Screen	active	Dr. Rodriguez	2025-08-27 08:00:00	\N	\N	2025-08-27 21:03:33.546772
be44237a-47ca-4eea-9a06-2a93d360d29a	334455667788	diet	NPO since midnight	active	Dr. Kim	2025-08-27 09:00:00	\N	\N	2025-08-27 21:03:33.612981
e6c6ba34-50c1-41ee-ba6d-4cf27500ad7d	334455667788	medication	Pre-operative IV antibiotics (Ancef 2g). Spinal anesthesia.	active	Dr. Kim	2025-08-27 09:00:00	\N	\N	2025-08-27 21:03:33.679015
ba4ec19a-62a9-4401-aa50-79fcf58b2e0f	334455667788	procedure	Abdominal prep for C-section	active	Dr. Kim	2025-08-27 09:00:00	\N	\N	2025-08-27 21:03:33.745886
f9f080d1-3a22-43bd-8114-08b55d27ecbd	334455667788	lab	CBC, CMP, Type & Crossmatch 2 units PRBCs	active	Dr. Kim	2025-08-27 09:00:00	\N	\N	2025-08-27 21:03:33.811964
62440009-49dc-4752-b21a-85f69a07bf92	445566778899	activity	Strict bed rest	active	Dr. Johnson	2025-08-27 02:15:00	\N	\N	2025-08-27 21:03:33.878194
5becac58-40f1-4f3a-91ec-02f9fa8cde92	445566778899	medication	Betamethasone 12mg IM x 2 doses, 24 hours apart	active	Dr. Johnson	2025-08-27 02:15:00	\N	\N	2025-08-27 21:03:33.945402
7efe3ac3-e232-4bfa-a5af-d974bbbdf11e	445566778899	medication	Magnesium Sulfate bolus and maintenance infusion for neuroprotection	active	Dr. Johnson	2025-08-27 02:15:00	\N	\N	2025-08-27 21:03:34.012027
4f5343d6-ae4d-4b20-914e-463b3bbe30e7	445566778899	medication	Tocolysis with Nifedipine	active	Dr. Johnson	2025-08-27 02:15:00	\N	\N	2025-08-27 21:03:34.078297
a96829df-8b62-463e-a3c5-5cbea72985a1	445566778899	procedure	Continuous fetal and contraction monitoring	active	Dr. Johnson	2025-08-27 02:15:00	\N	\N	2025-08-27 21:03:34.145035
4de0ae94-29b6-47e3-905d-45f751370f3a	445566778899	procedure	NICU consult	active	Dr. Johnson	2025-08-27 02:15:00	\N	\N	2025-08-27 21:03:34.211769
7c01ae8e-f868-4d68-a447-8355ab094ef7	556677889900	activity	Strict bed rest, seizure precautions	active	Dr. Thompson	2025-08-27 10:45:00	\N	\N	2025-08-27 21:03:34.278234
8e5cc464-cb0d-42fa-a1c2-46df0cab5400	556677889900	diet	NPO	active	Dr. Thompson	2025-08-27 10:45:00	\N	\N	2025-08-27 21:03:34.344787
9f8f2a91-ffa0-4d71-a172-34a8be6317b3	556677889900	medication	Magnesium Sulfate bolus and maintenance infusion for seizure prophylaxis	active	Dr. Thompson	2025-08-27 10:45:00	\N	\N	2025-08-27 21:03:34.411636
36f400cf-ef53-4fb1-b1a1-79cd2a986936	556677889900	medication	Labetalol 20mg IV push for BP > 160/110	active	Dr. Thompson	2025-08-27 10:45:00	\N	\N	2025-08-27 21:03:34.478447
64736b5a-0af1-4cd8-b5c2-1cad75c19643	556677889900	procedure	Prepare for induction of labor	active	Dr. Thompson	2025-08-27 10:45:00	\N	\N	2025-08-27 21:03:34.545947
7a71fc94-4885-4aee-96b1-86656e613c29	556677889900	lab	CBC with platelets, LFTs, Uric Acid, Urine Protein/Creatinine Ratio	active	Dr. Thompson	2025-08-27 10:45:00	\N	\N	2025-08-27 21:03:34.614943
9064cb63-6a64-4378-adff-d2824d2ef31d	667788990011	activity	Ambulate as tolerated	active	Dr. Anderson	2025-08-27 11:15:00	\N	\N	2025-08-27 21:03:34.681372
8f15d230-1b46-4f78-bf1b-60a8f9633f1c	667788990011	diet	Clear liquids	active	Dr. Anderson	2025-08-27 11:15:00	\N	\N	2025-08-27 21:03:34.747701
d7b16f52-9e16-4b12-9217-9303fd853ba9	667788990011	procedure	Continuous fetal monitoring	active	Dr. Anderson	2025-08-27 11:15:00	\N	\N	2025-08-27 21:03:34.814233
2164831c-5319-4040-be7a-09e6e9924144	667788990011	medication	Saline lock. Consent for TOLAC and repeat C-section signed.	active	Dr. Anderson	2025-08-27 11:15:00	\N	\N	2025-08-27 21:03:34.880723
eb3096dd-9f13-4a75-a0d4-5ff47d65214a	667788990011	lab	Type & Screen	active	Dr. Anderson	2025-08-27 11:15:00	\N	\N	2025-08-27 21:03:34.947152
7bfef535-9454-4946-9671-0ac884deb874	789123456789	diet	Breastfeeding on demand	active	Dr. Martinez	2025-08-27 10:52:00	\N	\N	2025-08-27 21:03:35.013439
59ee6414-af9f-49d2-ae4e-18337e28f2ab	789123456789	medication	Vitamin K 1mg IM	completed	Dr. Martinez	2025-08-27 10:52:00	\N	\N	2025-08-27 21:03:35.079729
9b967d4d-ff0b-4e77-b0f2-9c25a559818f	789123456789	medication	Erythromycin eye ointment	completed	Dr. Martinez	2025-08-27 10:52:00	\N	\N	2025-08-27 21:03:35.148566
2a276ca6-9352-43fa-a5f3-7ae7b675bd03	789123456789	procedure	Newborn screen at 24 hours of age	pending	Dr. Martinez	2025-08-27 10:52:00	\N	\N	2025-08-27 21:03:35.216031
73c97fc5-50d1-40bc-82ef-d74bed44178a	789123456789	procedure	Hearing screen at 24 hours of age	pending	Dr. Martinez	2025-08-27 10:52:00	\N	\N	2025-08-27 21:03:35.283356
179aa603-c7a4-492a-b1bb-8702f05a7c92	789123456789	procedure	CCHD screen at 24 hours of age	pending	Dr. Martinez	2025-08-27 10:52:00	\N	\N	2025-08-27 21:03:35.349716
a9069a2b-4c98-4cea-bb74-76affb4ca674	890234567890	diet	Formula feeding, 1-2 oz every 3-4 hours	active	Dr. Rodriguez	2025-08-27 11:01:00	\N	\N	2025-08-27 21:03:35.417287
ad38170e-ebd4-44c9-a806-67fbf6b1798f	890234567890	medication	Vitamin K 1mg IM	completed	Dr. Rodriguez	2025-08-27 11:01:00	\N	\N	2025-08-27 21:03:35.483806
f340a340-949a-4146-a6d4-dae6922f83cf	890234567890	medication	Erythromycin eye ointment	completed	Dr. Rodriguez	2025-08-27 11:01:00	\N	\N	2025-08-27 21:03:35.549283
30bbf3e3-2adc-4713-933f-1e745554b079	890234567890	lab	Blood glucose check before first three feeds due to large size	active	Dr. Rodriguez	2025-08-27 11:01:00	\N	\N	2025-08-27 21:03:35.61947
360c4ff5-0bfa-49d5-9af5-2d2a7e413bd1	890234567890	procedure	Newborn screen at 24 hours of age	pending	Dr. Rodriguez	2025-08-27 11:01:00	\N	\N	2025-08-27 21:03:35.685805
07906c09-2617-4783-98f3-ad55dbb24123	890234567890	procedure	Hearing screen at 24 hours of age	pending	Dr. Rodriguez	2025-08-27 11:01:00	\N	\N	2025-08-27 21:03:35.751972
3c523601-74bb-46f6-8111-5e3dd04b9623	901345678901	activity	NICU transitional care	active	Dr. Kim	2025-08-27 09:42:00	\N	\N	2025-08-27 21:03:35.818687
6cbed0c5-50c0-4856-a3b9-c67d6f45b930	901345678901	diet	Mother's expressed colostrum via syringe, then breast/bottle as tolerated	active	Dr. Kim	2025-08-27 09:42:00	\N	\N	2025-08-27 21:03:35.884997
072af27e-e55c-4de2-8488-b81f3bc33790	901345678901	medication	Vitamin K 1mg IM	completed	Dr. Kim	2025-08-27 09:42:00	\N	\N	2025-08-27 21:03:35.9515
b6a6986b-761a-41dc-82de-1710b43198fb	901345678901	medication	Erythromycin eye ointment	completed	Dr. Kim	2025-08-27 09:42:00	\N	\N	2025-08-27 21:03:36.017679
a0098c5b-22d4-4419-8ebd-54b30e612c5d	901345678901	lab	Glucose monitoring per twin protocol	active	Dr. Kim	2025-08-27 09:42:00	\N	\N	2025-08-27 21:03:36.083954
6f669877-b896-452b-aa0d-c2fd2cd59d27	901345678901	procedure	NICU assessment and monitoring	active	Dr. Kim	2025-08-27 09:42:00	\N	\N	2025-08-27 21:03:36.149248
69cb4afc-6c94-4397-a5d1-761075fe666c	012456789012	activity	NICU transitional care	active	Dr. Kim	2025-08-27 09:44:00	\N	\N	2025-08-27 21:03:36.216003
16ad0ef3-e1dc-453f-b906-8dbb676cab2c	012456789012	diet	Mother's expressed colostrum via syringe, then breast/bottle as tolerated	active	Dr. Kim	2025-08-27 09:44:00	\N	\N	2025-08-27 21:03:36.282271
3bc27e96-2789-484d-8002-6a52f8111db7	012456789012	medication	Vitamin K 1mg IM	completed	Dr. Kim	2025-08-27 09:44:00	\N	\N	2025-08-27 21:03:36.348962
412b1308-3979-4243-a4a9-79d59c4624a5	012456789012	medication	Erythromycin eye ointment	completed	Dr. Kim	2025-08-27 09:44:00	\N	\N	2025-08-27 21:03:36.415639
be76f770-bb0f-448b-8212-3b2a73e00a36	012456789012	lab	Glucose monitoring per twin protocol	active	Dr. Kim	2025-08-27 09:44:00	\N	\N	2025-08-27 21:03:36.482227
ddc14948-f451-441a-b0d3-dca955480b85	012456789012	procedure	NICU assessment and monitoring	active	Dr. Kim	2025-08-27 09:44:00	\N	\N	2025-08-27 21:03:36.548524
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (id, user_id, token, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, pin, role, created_at) FROM stdin;
a73b7100-2b56-4d91-9187-9b768ecd9c2d	instructor	112794	instructor	2025-08-27 21:03:36.700052
989222ec-f190-452f-b018-ee34ad58e4be	student1	112233	student	2025-08-27 21:03:36.83951
c775cc5c-5f35-4b29-b4e3-c1cc9218d9e7	student2	112234	student	2025-08-27 21:03:36.970601
d5cbe920-c08f-4a18-b86e-2679afcfd4db	a	0000	admin	2025-08-27 21:03:37.111651
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

