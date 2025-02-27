alter table assets
    add weightInGrams integer;

alter table sets
    add basedOnId TEXT;

alter table sets
    add jobId TEXT;

create index sets_basedOnId_index
    on sets (basedOnId);

create table jobs_sets_dg_tmp
(
    job_id    TEXT
        references jobs
            on delete cascade,
    set_id    TEXT
        references sets
            on delete cascade,
    quantity  INTEGER default 1,
    createdAt TEXT    default (datetime('now')),
    updatedAt TEXT    default (datetime('now')),
    primary key (job_id, set_id)
);

insert into jobs_sets_dg_tmp(job_id, set_id, quantity, createdAt, updatedAt)
select job_id, set_id, quantity, createdAt, updatedAt
from jobs_sets;

drop table jobs_sets;

alter table jobs_sets_dg_tmp
    rename to jobs_sets;

CREATE TRIGGER updated_jobs_sets
    AFTER UPDATE ON jobs_sets
    FOR EACH ROW
BEGIN
    UPDATE jobs_sets SET updatedAt = datetime('now') WHERE job_id = OLD.job_id AND set_id = OLD.set_id;
END;
