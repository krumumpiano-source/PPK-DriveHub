-- Migration 030: merge duplicate backfill queues (auto-generated)
-- Generated 2026-07-07T12:47:46.311Z
-- Clean groups merged: 22 | relinks: 17 | queue deletes: 22
-- NO usage_records are deleted. Only redundant queue rows are removed.

-- group 97d66518-d511-4ae2-abcb-54a491b5f13c|2026-05-25|14:31  keeper=08ca5e1d-d6af-48ad-82c7-d3a691637df4
UPDATE usage_records SET queue_id='08ca5e1d-d6af-48ad-82c7-d3a691637df4' WHERE id='521df4c3-785b-4ce4-84f5-f8bac302ffe2';
DELETE FROM queue WHERE id='090900c8-aa02-4079-bd35-4a07c8a6d85d';

-- group 97d66518-d511-4ae2-abcb-54a491b5f13c|2026-05-26|09:11  keeper=5fbcca6c-dc76-47c7-9160-3a981bf4d52c
UPDATE usage_records SET queue_id='5fbcca6c-dc76-47c7-9160-3a981bf4d52c' WHERE id='8ea74765-8547-4e91-9dd8-bae25b86989e';
DELETE FROM queue WHERE id='dfe3ed13-ac97-4e14-82e2-c3d74e3e9bd4';

-- group 97d66518-d511-4ae2-abcb-54a491b5f13c|2026-05-26|14:43  keeper=b10451d7-6142-472d-8d22-32a25a1e7fe9
UPDATE usage_records SET queue_id='b10451d7-6142-472d-8d22-32a25a1e7fe9' WHERE id='850f7b10-c822-4498-9247-fc1d56b057dc';
DELETE FROM queue WHERE id='163b1fc7-c9f2-4242-b15e-0fe2e0a0e794';

-- group 97d66518-d511-4ae2-abcb-54a491b5f13c|2026-05-27|10:09  keeper=291ba51d-6b02-4fcc-b640-675136ae88bf
UPDATE usage_records SET queue_id='291ba51d-6b02-4fcc-b640-675136ae88bf' WHERE id='c3af5b7f-1ff1-4864-8098-df9863c79e07';
DELETE FROM queue WHERE id='5ea14b27-31a6-4997-9d8a-50876c8d1b1a';

-- group 97d66518-d511-4ae2-abcb-54a491b5f13c|2026-06-22|04:54  keeper=fc6ba799-d830-45fc-80f7-d1fe34a63d12
DELETE FROM queue WHERE id='265db355-ea32-4917-909f-638843bfef47';

-- group 97d66518-d511-4ae2-abcb-54a491b5f13c|2026-06-25|08:42  keeper=a384c18b-d97b-42ad-9a3a-6e387326793f
DELETE FROM queue WHERE id='2243d6e3-ef9b-47ea-a376-5addf60138bf';

-- group b43ad8e2-04d0-40e0-90ab-d598bf44282d|2026-05-15|08:21  keeper=04c20e38-b977-44f0-b31a-7f749cd29541
DELETE FROM queue WHERE id='65f001d9-8d2f-438a-b953-1a99d15f1a18';

-- group b43ad8e2-04d0-40e0-90ab-d598bf44282d|2026-05-21|15:30  keeper=9281d5a0-6789-4652-a4e1-cc9a84ab84b6
DELETE FROM queue WHERE id='3db47588-144f-4dd5-a004-a8a754f64a5f';

-- group b43ad8e2-04d0-40e0-90ab-d598bf44282d|2026-05-22|09:04  keeper=738e20eb-ddd2-42d6-93e4-560c8ba14697
UPDATE usage_records SET queue_id='738e20eb-ddd2-42d6-93e4-560c8ba14697' WHERE id='f92931b6-c281-437a-ac6b-4f8594e3e4f1';
DELETE FROM queue WHERE id='0ecc9ee1-ac56-4c23-aacc-08044d921d23';

-- group b43ad8e2-04d0-40e0-90ab-d598bf44282d|2026-05-25|09:31  keeper=0afcdf90-101f-4ce1-825a-43e536c2bec9
UPDATE usage_records SET queue_id='0afcdf90-101f-4ce1-825a-43e536c2bec9' WHERE id='577f89f4-0235-42d8-8f19-35046275abce';
DELETE FROM queue WHERE id='c65e52b9-8877-41f2-924d-90261717d2b4';

-- group b43ad8e2-04d0-40e0-90ab-d598bf44282d|2026-05-27|07:24  keeper=7d5594a9-5caf-4fb2-8341-4a68fc1ef5ef
UPDATE usage_records SET queue_id='7d5594a9-5caf-4fb2-8341-4a68fc1ef5ef' WHERE id='529d9cd4-0f7b-410a-b4c4-8075264cbb65';
DELETE FROM queue WHERE id='62b41719-13e6-4016-a0a8-37683b418464';

-- group b7ee9471-dda3-45a5-94b0-605980a5214b|2026-05-22|09:00  keeper=860a403c-07de-4ea3-846a-e5f158c5c7e2
UPDATE usage_records SET queue_id='860a403c-07de-4ea3-846a-e5f158c5c7e2' WHERE id='d51dacb8-31b8-4726-87e3-3a2b73828a14';
DELETE FROM queue WHERE id='3bdb1888-71e1-4612-af3f-94f068ba64e2';

-- group b7ee9471-dda3-45a5-94b0-605980a5214b|2026-05-25|09:54  keeper=46a3788d-d20e-4e60-86e0-b3b25bc05894
UPDATE usage_records SET queue_id='46a3788d-d20e-4e60-86e0-b3b25bc05894' WHERE id='aba59ac9-5c3a-4d18-8a68-8c3c1ed4f607';
DELETE FROM queue WHERE id='c0700428-d04b-46b6-880d-47e64277257b';

-- group b7ee9471-dda3-45a5-94b0-605980a5214b|2026-05-26|08:35  keeper=d369d2e3-ff46-4ceb-8bcd-7ec141b3ad6a
DELETE FROM queue WHERE id='ae08c51a-f8f4-4243-954b-cc08f146dfdd';

-- group d1def56d-493a-47d6-a164-8d99c7ab44bd|2026-05-22|14:54  keeper=3d33c300-d6f7-4332-9f9a-e9b109555eb8
UPDATE usage_records SET queue_id='3d33c300-d6f7-4332-9f9a-e9b109555eb8' WHERE id='46cc9f05-6eec-439d-a7a0-d576b21cf69a';
DELETE FROM queue WHERE id='9ed77be6-4c8b-495e-ae0a-710d006a3a81';

-- group d5685d4b-914f-4140-8de6-6050a514ae9b|2026-05-22|09:41  keeper=0a030c16-3ab6-4bed-b710-41f09bc47322
UPDATE usage_records SET queue_id='0a030c16-3ab6-4bed-b710-41f09bc47322' WHERE id='fbed971e-71b0-4588-9e0a-2585f1097c5f';
DELETE FROM queue WHERE id='dae9bb01-e17d-487c-a20a-ed6b4a3e3807';

-- group d5685d4b-914f-4140-8de6-6050a514ae9b|2026-05-22|13:43  keeper=c937212d-3650-4425-9032-d84859140168
UPDATE usage_records SET queue_id='c937212d-3650-4425-9032-d84859140168' WHERE id='4a67cd04-b05f-433a-a185-d73e25903396';
DELETE FROM queue WHERE id='6153f2a7-5f09-47a7-baa3-39be3b404a77';

-- group d5685d4b-914f-4140-8de6-6050a514ae9b|2026-05-25|12:40  keeper=c1be23cd-b7fd-4390-8b6e-2956f79ea33a
UPDATE usage_records SET queue_id='c1be23cd-b7fd-4390-8b6e-2956f79ea33a' WHERE id='c8881e27-399a-4b78-bca9-9f6dd580257f';
DELETE FROM queue WHERE id='8cb2ee1d-367e-4c57-a6c2-be617a5f5074';

-- group d5685d4b-914f-4140-8de6-6050a514ae9b|2026-05-25|14:06  keeper=476198a5-163b-4c92-baf1-25434fbfa2a3
UPDATE usage_records SET queue_id='476198a5-163b-4c92-baf1-25434fbfa2a3' WHERE id='180e7784-c5a5-43c6-99cd-998652a6cd34';
DELETE FROM queue WHERE id='4fdc3779-9062-465b-b8ff-85e7dbe91a7d';

-- group d5685d4b-914f-4140-8de6-6050a514ae9b|2026-05-26|10:27  keeper=5793714c-2c24-457c-8b02-0d6b78f0a21e
UPDATE usage_records SET queue_id='5793714c-2c24-457c-8b02-0d6b78f0a21e' WHERE id='994ede3d-c69d-43ac-95e1-e2e58cb6a352';
DELETE FROM queue WHERE id='318e9ac2-5385-439c-bed5-f8db570ff611';

-- group d5685d4b-914f-4140-8de6-6050a514ae9b|2026-05-27|09:37  keeper=d4b350be-3677-43e2-9ac7-54032540e028
UPDATE usage_records SET queue_id='d4b350be-3677-43e2-9ac7-54032540e028' WHERE id='4daf8aa9-a5bc-4274-949a-8acb78b436aa';
DELETE FROM queue WHERE id='c942433c-7945-4fe0-87e2-c29e2ba439ec';

-- group df5fd5a5-287e-4e10-a8d0-f6818daa6522|2026-05-23|10:15  keeper=ad3439db-7ba2-4673-a3d8-6f7b8f1927a4
UPDATE usage_records SET queue_id='ad3439db-7ba2-4673-a3d8-6f7b8f1927a4' WHERE id='12f39e64-6c4c-47ca-b6d7-8ddb9e3177e4';
DELETE FROM queue WHERE id='981f7ebe-7cd4-4bb7-b0e4-54e9fc33addc';
